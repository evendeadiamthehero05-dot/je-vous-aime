export type LivingRoomState =
  | 'NOT_SEATED'
  | 'PARTIALLY_SEATED'
  | 'BOTH_SEATED'
  | 'STILLNESS_IN_PROGRESS'
  | 'COMPLETED';

export type PresenceStatePayload = {
  state: LivingRoomState;
  completedAt: string | null;
  stillnessStartedAt: string | null;
};

export type PresenceProgressUpdate = {
  type: 'presence_progress_update';
  kind: 'stillness_started' | 'stillness_interrupted';
};

export type PresenceCompleted = {
  type: 'presence_completed';
  completedAt: string;
};

export type PresenceChanged = {
  participantId: string;
  connected: boolean;
};
