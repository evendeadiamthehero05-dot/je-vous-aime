import { ParticipantSlot } from '@prisma/client';

export function slotKey(slot: ParticipantSlot): 'A' | 'B' {
  return slot === ParticipantSlot.playerA ? 'A' : 'B';
}
