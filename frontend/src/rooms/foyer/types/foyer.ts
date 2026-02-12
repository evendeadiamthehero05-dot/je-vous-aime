export type FoyerPhase = 'DARK' | 'LIGHT_IN_PROGRESS' | 'LIT' | 'NOTE_ENTRY' | 'NOTE_LOCKED';

export type FoyerStatePayload = {
  houseSessionId: string;
  phase: FoyerPhase;
  hold: {
    thresholdMs: number;
    overlapStartedAt: string | null;
    overlapDeadlineAt: string | null;
    playerA: { pressed: boolean };
    playerB: { pressed: boolean };
  };
  note: {
    prompt: string;
    maxChars: number;
    draft: string;
    draftedByParticipantId: string | null;
    draftedAt: string | null;
    confirmations: {
      playerA: boolean;
      playerB: boolean;
    };
  };
  outcome: {
    lightActivatedAt: string | null;
    crisisSentence: string | null;
    crisisSentenceSubmittedAt: string | null;
    playerIDsInvolved: string[] | null;
    roomCompletionStatus: string;
  };
};

export type FoyerEventPayload = {
  type: 'foyer:event';
  event: 'hold_started' | 'hold_interrupted' | 'hold_completed' | 'note_locked';
  reason?: 'release' | 'disconnect';
  thresholdMs?: number;
  overlapDeadlineAt?: string;
};

export type HoldIntent = { type: 'hold_start' } | { type: 'hold_end' };
export type NoteIntent =
  | { type: 'note_update'; value: string }
  | { type: 'note_confirm'; confirmed: boolean };
export type FoyerIntent = HoldIntent | NoteIntent;
