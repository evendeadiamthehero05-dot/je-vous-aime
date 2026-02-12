export type DoorState = 'LOCKED' | 'UNLOCKED' | 'TRANSITIONED';

export type DoorStatePayload = {
  state: DoorState;
  unlockedBy: string | null;
  unlockedAt: string | null;
};

export type DoorUnlockPayload = {
  type: 'door_unlocked';
  sessionId: string;
  unlockedBy: string;
  unlockedAt: string;
  state: 'UNLOCKED';
};
