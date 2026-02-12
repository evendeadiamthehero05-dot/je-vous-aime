import {
  FoyerPhase,
  ParticipantSlot,
  Prisma,
  PrismaClient,
  type FoyerState,
  type HouseSession,
  type Participant
} from '@prisma/client';
import { assertOneLine, assertTransition, CRISIS_SENTENCE_MAX_CHARS, FOYER_PROMPT, sanitizeSentenceDraft } from './foyer.rules.js';
import { slotKey } from '../../utils/slot.js';

type HoldIntent = { type: 'hold_start' } | { type: 'hold_end' };
type NoteIntent = { type: 'note_update'; value: string } | { type: 'note_confirm'; confirmed: boolean };
export type FoyerIntent = HoldIntent | NoteIntent;

type HouseBundle = HouseSession & {
  participants: Participant[];
  foyer: FoyerState | null;
};

type BroadcastFn = (houseSessionId: string, payload: { type: string; [key: string]: unknown }) => void;

export class FoyerService {
  private readonly prisma: PrismaClient;
  private readonly holdTimers = new Map<string, NodeJS.Timeout>();
  private readonly broadcast: BroadcastFn;

  constructor(prismaClient: PrismaClient, broadcast: BroadcastFn) {
    this.prisma = prismaClient;
    this.broadcast = broadcast;
  }

  async ensureFoyer(houseSessionId: string): Promise<void> {
    const foyer = await this.prisma.foyerState.upsert({
      where: { houseSessionId },
      update: {},
      create: {
        houseSessionId,
        phase: FoyerPhase.DARK,
        holdThresholdMs: 4000,
        notePrompt: FOYER_PROMPT,
        roomCompletionStatus: 'INCOMPLETE'
      }
    });

    if (foyer.phase === FoyerPhase.LIGHT_IN_PROGRESS) {
      // Partial hold progress cannot persist across reconnect/restart cycles.
      await this.prisma.foyerState.update({
        where: { houseSessionId },
        data: {
          phase: FoyerPhase.DARK,
          overlapStartedAt: null,
          overlapDeadlineAt: null,
          playerAHolding: false,
          playerBHolding: false
        }
      });
    }
  }

  async setParticipantConnected(participantId: string, connected: boolean): Promise<void> {
    const participant = await this.prisma.participant.update({
      where: { id: participantId },
      data: { connected }
    });

    if (!connected) {
      await this.resetHoldOnDisconnect(participant.houseSessionId);
    }
  }

  async snapshot(houseSessionId: string): Promise<Record<string, unknown>> {
    const house = await this.loadHouse(houseSessionId);
    return this.toStateDTO(house);
  }

  async applyIntent(params: { houseSessionId: string; participantId: string; intent: FoyerIntent }): Promise<void> {
    const { houseSessionId, participantId, intent } = params;

    if (intent.type === 'hold_start' || intent.type === 'hold_end') {
      await this.applyHoldIntent(houseSessionId, participantId, intent);
      return;
    }

    await this.applyNoteIntent(houseSessionId, participantId, intent);
  }

  private async applyHoldIntent(houseSessionId: string, participantId: string, intent: HoldIntent): Promise<void> {
    let shouldSchedule = false;
    let shouldCancel = false;

    await this.prisma.$transaction(async (tx) => {
      const house = await this.loadHouse(houseSessionId, tx);
      const participant = this.requireParticipant(house, participantId);
      const foyer = this.requireFoyer(house);

      this.assertTwoPlayerHouse(house);
      if (foyer.phase === FoyerPhase.LIT || foyer.phase === FoyerPhase.NOTE_ENTRY || foyer.phase === FoyerPhase.NOTE_LOCKED) {
        return;
      }

      const isPlayerA = participant.slot === ParticipantSlot.playerA;
      const patch: Prisma.FoyerStateUpdateInput = isPlayerA
        ? { playerAHolding: intent.type === 'hold_start' }
        : { playerBHolding: intent.type === 'hold_start' };

      const nextPlayerAHolding = isPlayerA ? intent.type === 'hold_start' : foyer.playerAHolding;
      const nextPlayerBHolding = isPlayerA ? foyer.playerBHolding : intent.type === 'hold_start';

      if (intent.type === 'hold_end' && foyer.phase === FoyerPhase.LIGHT_IN_PROGRESS) {
        // Emotional rule: releasing early wipes progress immediately to prevent solo carry-over.
        assertTransition(foyer.phase, FoyerPhase.DARK);
        await tx.foyerState.update({
          where: { houseSessionId },
          data: {
            ...patch,
            phase: FoyerPhase.DARK,
            overlapStartedAt: null,
            overlapDeadlineAt: null,
            playerAHolding: false,
            playerBHolding: false
          }
        });
        shouldCancel = true;
        this.broadcast(houseSessionId, {
          type: 'foyer:event',
          event: 'hold_interrupted',
          reason: 'release'
        });
        return;
      }

      if (intent.type === 'hold_start' && nextPlayerAHolding && nextPlayerBHolding) {
        const from = foyer.phase === FoyerPhase.DARK ? FoyerPhase.DARK : FoyerPhase.LIGHT_IN_PROGRESS;
        assertTransition(from, FoyerPhase.LIGHT_IN_PROGRESS);

        const deadline = new Date(Date.now() + foyer.holdThresholdMs);

        // Both partners must overlap for the full threshold; backend owns this clock.
        await tx.foyerState.update({
          where: { houseSessionId },
          data: {
            ...patch,
            phase: FoyerPhase.LIGHT_IN_PROGRESS,
            overlapStartedAt: new Date(),
            overlapDeadlineAt: deadline
          }
        });

        shouldSchedule = true;
        this.broadcast(houseSessionId, {
          type: 'foyer:event',
          event: 'hold_started',
          thresholdMs: foyer.holdThresholdMs,
          overlapDeadlineAt: deadline.toISOString()
        });
        return;
      }

      await tx.foyerState.update({
        where: { houseSessionId },
        data: patch
      });
    });

    if (shouldCancel) {
      this.cancelHoldTimer(houseSessionId);
    }
    if (shouldSchedule) {
      await this.scheduleHoldTimer(houseSessionId);
    }

    await this.broadcastState(houseSessionId);
  }

  private async applyNoteIntent(houseSessionId: string, participantId: string, intent: NoteIntent): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const house = await this.loadHouse(houseSessionId, tx);
      const participant = this.requireParticipant(house, participantId);
      const foyer = this.requireFoyer(house);

      this.assertTwoPlayerHouse(house);
      if (foyer.phase === FoyerPhase.DARK || foyer.phase === FoyerPhase.LIGHT_IN_PROGRESS) {
        throw new Error('Cannot enter note phase before light ritual completion.');
      }
      if (foyer.phase === FoyerPhase.NOTE_LOCKED || foyer.crisisSentence) {
        // Immutable lock rule: no rewrite path once the sentence is committed.
        return;
      }

      if (intent.type === 'note_update') {
        assertOneLine(intent.value);
        const draft = sanitizeSentenceDraft(intent.value);

        const targetPhase = foyer.phase === FoyerPhase.LIT ? FoyerPhase.NOTE_ENTRY : foyer.phase;
        assertTransition(foyer.phase, targetPhase);

        // Confirmations reset on edit so consent always matches the current text.
        await tx.foyerState.update({
          where: { houseSessionId },
          data: {
            phase: targetPhase,
            noteDraft: draft,
            noteDraftedByParticipantId: participant.id,
            noteDraftedAt: new Date(),
            noteConfirmA: false,
            noteConfirmB: false
          }
        });
        return;
      }

      if (intent.type === 'note_confirm') {
        const draft = foyer.noteDraft.trim();
        if (!draft) {
          throw new Error('Cannot confirm an empty sentence.');
        }
        if (draft.length > CRISIS_SENTENCE_MAX_CHARS) {
          throw new Error('Sentence exceeds max length.');
        }

        const confirmPatch: Prisma.FoyerStateUpdateInput =
          participant.slot === ParticipantSlot.playerA
            ? { noteConfirmA: intent.confirmed }
            : { noteConfirmB: intent.confirmed };

        const nextConfirmA = participant.slot === ParticipantSlot.playerA ? intent.confirmed : foyer.noteConfirmA;
        const nextConfirmB = participant.slot === ParticipantSlot.playerB ? intent.confirmed : foyer.noteConfirmB;

        if (!(nextConfirmA && nextConfirmB)) {
          await tx.foyerState.update({ where: { houseSessionId }, data: confirmPatch });
          return;
        }

        assertTransition(foyer.phase === FoyerPhase.LIT ? FoyerPhase.NOTE_ENTRY : foyer.phase, FoyerPhase.NOTE_LOCKED);

        // Final write is single-transaction to avoid partial "locked" states.
        await tx.foyerState.update({
          where: { houseSessionId },
          data: {
            ...confirmPatch,
            phase: FoyerPhase.NOTE_LOCKED,
            crisisSentence: draft,
            crisisSentenceSubmittedAt: new Date(),
            playerIDsInvolved: house.participants.map((p) => p.id),
            roomCompletionStatus: 'COMPLETED'
          }
        });

        this.broadcast(houseSessionId, {
          type: 'foyer:event',
          event: 'note_locked'
        });
      }
    });

    await this.broadcastState(houseSessionId);
  }

  private async resetHoldOnDisconnect(houseSessionId: string): Promise<void> {
    let interrupted = false;

    await this.prisma.$transaction(async (tx) => {
      const house = await this.loadHouse(houseSessionId, tx);
      const foyer = this.requireFoyer(house);

      if (foyer.phase !== FoyerPhase.LIGHT_IN_PROGRESS) {
        return;
      }

      // Disconnect during hold invalidates synchronization by design.
      assertTransition(foyer.phase, FoyerPhase.DARK);
      await tx.foyerState.update({
        where: { houseSessionId },
        data: {
          phase: FoyerPhase.DARK,
          overlapStartedAt: null,
          overlapDeadlineAt: null,
          playerAHolding: false,
          playerBHolding: false
        }
      });
      interrupted = true;
    });

    if (!interrupted) return;

    this.cancelHoldTimer(houseSessionId);
    this.broadcast(houseSessionId, {
      type: 'foyer:event',
      event: 'hold_interrupted',
      reason: 'disconnect'
    });
    await this.broadcastState(houseSessionId);
  }

  private async scheduleHoldTimer(houseSessionId: string): Promise<void> {
    this.cancelHoldTimer(houseSessionId);
    const foyer = await this.prisma.foyerState.findUnique({ where: { houseSessionId } });
    const threshold = foyer?.holdThresholdMs ?? 4000;

    const timer = setTimeout(async () => {
      try {
        let completed = false;

        await this.prisma.$transaction(async (tx) => {
          const house = await this.loadHouse(houseSessionId, tx);
          const foyer = this.requireFoyer(house);

          if (foyer.phase !== FoyerPhase.LIGHT_IN_PROGRESS) return;
          if (!foyer.playerAHolding || !foyer.playerBHolding) return;
          if (!foyer.overlapDeadlineAt || foyer.overlapDeadlineAt > new Date()) return;

          assertTransition(foyer.phase, FoyerPhase.LIT);
          await tx.foyerState.update({
            where: { houseSessionId },
            data: {
              phase: FoyerPhase.LIT,
              playerAHolding: false,
              playerBHolding: false,
              overlapStartedAt: null,
              overlapDeadlineAt: null,
              lightActivatedAt: new Date(),
              roomCompletionStatus: 'LIGHT_ACTIVATED',
              playerIDsInvolved: house.participants.map((p) => p.id)
            }
          });
          completed = true;
        });

        if (!completed) return;

        this.broadcast(houseSessionId, {
          type: 'foyer:event',
          event: 'hold_completed'
        });
        await this.broadcastState(houseSessionId);
      } catch (error) {
        // Keep timer errors contained so one failed callback cannot crash the room service.
        console.error('foyer hold timer failed', error);
      }
    }, threshold + 75);

    this.holdTimers.set(houseSessionId, timer);
  }

  private cancelHoldTimer(houseSessionId: string): void {
    const timer = this.holdTimers.get(houseSessionId);
    if (!timer) return;

    clearTimeout(timer);
    this.holdTimers.delete(houseSessionId);
  }

  private async broadcastState(houseSessionId: string): Promise<void> {
    const house = await this.loadHouse(houseSessionId);
    this.broadcast(houseSessionId, {
      type: 'foyer:state',
      state: this.toStateDTO(house)
    });
  }

  private toStateDTO(house: HouseBundle): Record<string, unknown> {
    const foyer = this.requireFoyer(house);

    return {
      houseSessionId: house.id,
      phase: foyer.phase,
      hold: {
        thresholdMs: foyer.holdThresholdMs,
        overlapStartedAt: foyer.overlapStartedAt?.toISOString() ?? null,
        overlapDeadlineAt: foyer.overlapDeadlineAt?.toISOString() ?? null,
        playerA: { pressed: foyer.playerAHolding },
        playerB: { pressed: foyer.playerBHolding }
      },
      note: {
        prompt: foyer.notePrompt,
        maxChars: CRISIS_SENTENCE_MAX_CHARS,
        draft: foyer.noteDraft,
        draftedByParticipantId: foyer.noteDraftedByParticipantId,
        draftedAt: foyer.noteDraftedAt?.toISOString() ?? null,
        confirmations: {
          playerA: foyer.noteConfirmA,
          playerB: foyer.noteConfirmB
        }
      },
      outcome: {
        lightActivatedAt: foyer.lightActivatedAt?.toISOString() ?? null,
        crisisSentence: foyer.crisisSentence,
        crisisSentenceSubmittedAt: foyer.crisisSentenceSubmittedAt?.toISOString() ?? null,
        playerIDsInvolved: foyer.playerIDsInvolved,
        roomCompletionStatus: foyer.roomCompletionStatus
      }
    };
  }

  private async loadHouse(houseSessionId: string, tx?: Prisma.TransactionClient): Promise<HouseBundle> {
    const client = tx ?? this.prisma;
    const house = await client.houseSession.findUnique({
      where: { id: houseSessionId },
      include: {
        participants: true,
        foyer: true
      }
    });

    if (!house) {
      throw new Error('House session not found.');
    }

    return house;
  }

  private requireFoyer(house: HouseBundle): FoyerState {
    if (!house.foyer) {
      throw new Error('Foyer state not initialized.');
    }
    return house.foyer;
  }

  private requireParticipant(house: HouseBundle, participantId: string): Participant {
    const participant = house.participants.find((p) => p.id === participantId);
    if (!participant) {
      throw new Error('Participant does not belong to this house.');
    }
    return participant;
  }

  private assertTwoPlayerHouse(house: HouseBundle): void {
    if (house.participants.length !== 2) {
      throw new Error('Foyer requires exactly two participants.');
    }

    const slots = new Set(house.participants.map((p) => slotKey(p.slot)));
    if (!slots.has('A') || !slots.has('B')) {
      throw new Error('House must contain playerA and playerB slots.');
    }
  }
}
