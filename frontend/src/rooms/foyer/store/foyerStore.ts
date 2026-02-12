import { create } from 'zustand';
import type { FoyerEventPayload, FoyerStatePayload } from '../types/foyer';

type Presence = {
  selfParticipantId: string;
  selfSlot: 'playerA' | 'playerB';
  partnerParticipantId: string;
};

type FoyerUiStore = {
  roomState: FoyerStatePayload | null;
  lastEvent: FoyerEventPayload | null;
  connected: boolean;
  presence: Presence | null;
  setConnected: (connected: boolean) => void;
  setPresence: (presence: Presence) => void;
  setRoomState: (roomState: FoyerStatePayload) => void;
  setLastEvent: (event: FoyerEventPayload | null) => void;
};

export const useFoyerStore = create<FoyerUiStore>((set) => ({
  roomState: null,
  lastEvent: null,
  connected: false,
  presence: null,
  setConnected: (connected) => set({ connected }),
  setPresence: (presence) => set({ presence }),
  setRoomState: (roomState) => set({ roomState }),
  setLastEvent: (lastEvent) => set({ lastEvent })
}));
