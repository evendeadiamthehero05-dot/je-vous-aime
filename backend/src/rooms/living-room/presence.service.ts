import { LivingRoomState, ParticipantSlot, PrismaClient } from '@prisma/client';

const STILLNESS_WINDOW_MS = 15_000;

type Broadcast = (houseSessionId: string, payload: { type: string; [key: string]: unknown }) => void;

const ALLOWED_TRANSITIONS: Record<LivingRoomState, Set<LivingRoomState>> = {
  [LivingRoomState.NOT_SEATED]: new Set([LivingRoomState.PARTIALLY_SEATED]),
  [LivingRoomState.PARTIALLY_SEATED]: new Set([LivingRoomState.NOT_SEATED, LivingRoomState.BOTH_SEATED]),
  [LivingRoomState.BOTH_SEATED]: new Set([LivingRoomState.PARTIALLY_SEATED, LivingRoomState.NOT_SEATED, LivingRoomState.STILLNESS_IN_PROGRESS]),
  [LivingRoomState.STILLNESS_IN_PROGRESS]: new Set([LivingRoomState.BOTH_SEATED, LivingRoomState.NOT_SEATED, LivingRoomState.COMPLETED]),
  [LivingRoomState.COMPLETED]: new Set([])
};

export class LivingRoomService {
  private readonly prisma: PrismaClient;
  private readonly broadcast: Broadcast;
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly seatedBySession = new Map<string, Set<string>>();

  constructor(prismaClient: PrismaClient, broadcast: Broadcast) {
    this.prisma = prismaClient;
    this.broadcast = broadcast;
  }

  async snapshot(houseSessionId: string) {
    const house = await this.prisma.houseSession.findUnique({
      where: { id: houseSessionId },
      select: {
        livingRoomState: true,
        livingRoomCompletedAt: true,
        livingRoomStillnessStartedAt: true
      }
    });

    if (!house) {
      throw new Error('Invalid session.');
    }

    return {
      state: house.livingRoomState,
      completedAt: house.livingRoomCompletedAt?.toISOString() ?? null,
      stillnessStartedAt: house.livingRoomStillnessStartedAt?.toISOString() ?? null
    };
  }

  async handleSitOnCouch(houseSessionId: string, playerId: string): Promise<void> {
    const house = await this.loadHouse(houseSessionId);
    if (!house || house.livingRoomState === LivingRoomState.COMPLETED) return;

    if (!this.isParticipantInHouse(house, playerId)) return;

    const seated = this.getSeatedSet(houseSessionId);
    seated.add(playerId);

    if (seated.size === 1) {
      await this.transitionAndBroadcast(houseSessionId, house.livingRoomState, LivingRoomState.PARTIALLY_SEATED, null);
      return;
    }

    if (seated.size >= 2) {
      await this.transitionAndBroadcast(houseSessionId, house.livingRoomState, LivingRoomState.BOTH_SEATED, null);
      await this.startStillnessIfEligible(houseSessionId);
    }
  }

  async handleStandUp(houseSessionId: string, playerId: string): Promise<void> {
    const house = await this.loadHouse(houseSessionId);
    if (!house || house.livingRoomState === LivingRoomState.COMPLETED) return;

    if (!this.isParticipantInHouse(house, playerId)) return;

    const seated = this.getSeatedSet(houseSessionId);
    seated.delete(playerId);

    this.clearStillnessTimer(houseSessionId);

    if (seated.size === 0) {
      await this.transitionAndBroadcast(houseSessionId, house.livingRoomState, LivingRoomState.NOT_SEATED, null);
      return;
    }

    await this.transitionAndBroadcast(houseSessionId, house.livingRoomState, LivingRoomState.PARTIALLY_SEATED, null);
  }

  async handleInteractionDetected(houseSessionId: string, playerId: string): Promise<void> {
    const house = await this.loadHouse(houseSessionId);
    if (!house || house.livingRoomState === LivingRoomState.COMPLETED) return;

    if (!this.isParticipantInHouse(house, playerId)) return;
    if (house.livingRoomState !== LivingRoomState.STILLNESS_IN_PROGRESS) return;

    // Emotional discipline: any interaction breaks stillness immediately, with no negotiation.
    this.clearStillnessTimer(houseSessionId);
    await this.transitionAndBroadcast(houseSessionId, LivingRoomState.STILLNESS_IN_PROGRESS, LivingRoomState.BOTH_SEATED, null);

    this.broadcast(houseSessionId, {
      type: 'presence_progress_update',
      kind: 'stillness_interrupted'
    });

    await this.startStillnessIfEligible(houseSessionId);
  }

  async handleConnected(houseSessionId: string, playerId: string): Promise<void> {
    const house = await this.loadHouse(houseSessionId);
    if (!house || house.livingRoomState === LivingRoomState.COMPLETED) return;

    if (!this.isParticipantInHouse(house, playerId)) return;
    await this.startStillnessIfEligible(houseSessionId);
  }

  async handleDisconnect(houseSessionId: string, playerId: string): Promise<void> {
    const house = await this.loadHouse(houseSessionId);
    if (!house || house.livingRoomState === LivingRoomState.COMPLETED) return;

    const seated = this.getSeatedSet(houseSessionId);
    seated.delete(playerId);

    // Presence room must fully reset when connection presence breaks.
    this.clearStillnessTimer(houseSessionId);
    await this.transitionAndBroadcast(houseSessionId, house.livingRoomState, LivingRoomState.NOT_SEATED, null);
  }

  private async startStillnessIfEligible(houseSessionId: string): Promise<void> {
    const house = await this.loadHouse(houseSessionId);
    if (!house || house.livingRoomState === LivingRoomState.COMPLETED) return;

    if (house.participants.length !== 2) return;
    if (!house.participants.every((p) => p.connected)) return;

    const hasA = house.participants.some((p) => p.slot === ParticipantSlot.playerA);
    const hasB = house.participants.some((p) => p.slot === ParticipantSlot.playerB);
    if (!hasA || !hasB) return;

    const seated = this.getSeatedSet(houseSessionId);
    if (seated.size < 2) return;

    const existingStartedAt = house.livingRoomStillnessStartedAt ?? null;
    const shouldResume =
      house.livingRoomState === LivingRoomState.STILLNESS_IN_PROGRESS && existingStartedAt !== null;

    const startedAt = shouldResume ? existingStartedAt : new Date();

    if (!shouldResume) {
      await this.transitionAndBroadcast(
        houseSessionId,
        house.livingRoomState,
        LivingRoomState.STILLNESS_IN_PROGRESS,
        startedAt
      );

      // Deliberately subtle progress signal; the room gives no instructions or countdowns.
      this.broadcast(houseSessionId, {
        type: 'presence_progress_update',
        kind: 'stillness_started'
      });
    } else if (!existingStartedAt) {
      await this.prisma.houseSession.update({
        where: { id: houseSessionId },
        data: { livingRoomStillnessStartedAt: startedAt }
      });
      await this.emitState(houseSessionId);
    }

    this.clearStillnessTimer(houseSessionId);

    const elapsed = Date.now() - startedAt.getTime();
    const remaining = Math.max(0, STILLNESS_WINDOW_MS - elapsed);

    // Use server timestamps so brief network jitter does not reset the window.
    const timer = setTimeout(async () => {
      await this.completeStillnessWindow(houseSessionId, startedAt);
    }, remaining);

    this.timers.set(houseSessionId, timer);
  }

  private async completeStillnessWindow(houseSessionId: string, startedAt: Date): Promise<void> {
    const house = await this.loadHouse(houseSessionId);
    if (!house || house.livingRoomState === LivingRoomState.COMPLETED) return;

    const seated = this.getSeatedSet(houseSessionId);
    if (seated.size < 2) return;
    if (house.participants.length !== 2) return;
    if (!house.participants.every((p) => p.connected)) return;

    if (house.livingRoomState !== LivingRoomState.STILLNESS_IN_PROGRESS) return;
    if (!house.livingRoomStillnessStartedAt) return;

    const sameWindow = house.livingRoomStillnessStartedAt.getTime() === startedAt.getTime();
    if (!sameWindow) return;

    const elapsed = Date.now() - house.livingRoomStillnessStartedAt.getTime();
    if (elapsed < STILLNESS_WINDOW_MS) return;

    const completedAt = new Date();

    const result = await this.prisma.houseSession.updateMany({
      where: {
        id: houseSessionId,
        livingRoomState: LivingRoomState.STILLNESS_IN_PROGRESS,
        livingRoomCompletedAt: null
      },
      data: {
        livingRoomState: LivingRoomState.COMPLETED,
        livingRoomCompletedAt: completedAt
      }
    });

    if (result.count !== 1) return;

    this.clearStillnessTimer(houseSessionId);

    this.broadcast(houseSessionId, {
      type: 'presence_completed',
      completedAt: completedAt.toISOString()
    });

    await this.emitState(houseSessionId);
  }

  private async transitionAndBroadcast(
    houseSessionId: string,
    from: LivingRoomState,
    to: LivingRoomState,
    stillnessStartedAt: Date | null
  ): Promise<void> {
    if (from === LivingRoomState.COMPLETED && to !== LivingRoomState.COMPLETED) return;

    if (from !== to) {
      const allowed = ALLOWED_TRANSITIONS[from];
      if (!allowed?.has(to)) {
        return;
      }
    }

    await this.prisma.houseSession.update({
      where: { id: houseSessionId },
      data: {
        livingRoomState: to,
        livingRoomStillnessStartedAt: stillnessStartedAt
      }
    });

    await this.emitState(houseSessionId);
  }

  private async emitState(houseSessionId: string): Promise<void> {
    const state = await this.snapshot(houseSessionId);
    this.broadcast(houseSessionId, {
      type: 'presence_state_update',
      state
    });
  }

  private getSeatedSet(houseSessionId: string): Set<string> {
    const existing = this.seatedBySession.get(houseSessionId);
    if (existing) return existing;

    const next = new Set<string>();
    this.seatedBySession.set(houseSessionId, next);
    return next;
  }

  private clearStillnessTimer(houseSessionId: string): void {
    const timer = this.timers.get(houseSessionId);
    if (!timer) return;

    clearTimeout(timer);
    this.timers.delete(houseSessionId);
  }

  private isParticipantInHouse(
    house: { participants: Array<{ id: string }> },
    playerId: string
  ): boolean {
    return house.participants.some((p) => p.id === playerId);
  }

  private loadHouse(houseSessionId: string) {
    return this.prisma.houseSession.findUnique({
      where: { id: houseSessionId },
      include: { participants: true }
    });
  }
}
