import { create } from 'zustand';
import type { PresenceCompleted, PresenceProgressUpdate, PresenceStatePayload } from '../types/presence';

type PresenceIdentity = {
  selfParticipantId: string;
  selfSlot: 'playerA' | 'playerB';
  partnerParticipantId: string;
};

type PresenceUiStore = {
  roomState: PresenceStatePayload | null;
  connected: boolean;
  partnerConnected: boolean;
  presence: PresenceIdentity | null;
  lastProgress: PresenceProgressUpdate | null;
  lastCompleted: PresenceCompleted | null;
  setConnected: (connected: boolean) => void;
  setPartnerConnected: (connected: boolean) => void;
  setPresence: (presence: PresenceIdentity) => void;
  setRoomState: (roomState: PresenceStatePayload) => void;
  setLastProgress: (progress: PresenceProgressUpdate | null) => void;
  setLastCompleted: (completed: PresenceCompleted | null) => void;
};

export const usePresenceStore = create<PresenceUiStore>((set) => ({
  roomState: null,
  connected: false,
  partnerConnected: true,
  presence: null,
  lastProgress: null,
  lastCompleted: null,
  setConnected: (connected) => set({ connected }),
  setPartnerConnected: (partnerConnected) => set({ partnerConnected }),
  setPresence: (presence) => set({ presence }),
  setRoomState: (roomState) => set({ roomState }),
  setLastProgress: (lastProgress) => set({ lastProgress }),
  setLastCompleted: (lastCompleted) => set({ lastCompleted })
}));
