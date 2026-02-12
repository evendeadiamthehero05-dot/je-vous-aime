import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useFoyerStore } from '../store/foyerStore';
import type { FoyerEventPayload, FoyerIntent, FoyerStatePayload } from '../types/foyer';

type RoomStateArgs = {
  serverUrl: string;
  houseSessionId: string;
  participantId: string;
  selfSlot: 'playerA' | 'playerB';
  partnerParticipantId: string;
};

type HoldActions = {
  onHoldStart: () => void;
  onHoldEnd: () => void;
};

type TypingSync = {
  draft: string;
  maxChars: number;
  partnerThinking: boolean;
  waitingForPartnerConfirm: boolean;
  updateDraft: (value: string) => void;
  confirmDraft: () => void;
};

const socketCache = new Map<string, Socket>();

function getSocket(serverUrl: string): Socket {
  const cached = socketCache.get(serverUrl);
  if (cached) return cached;

  const socket = io(serverUrl, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 600
  });
  socketCache.set(serverUrl, socket);
  return socket;
}

export function useRoomState(args: RoomStateArgs) {
  const { roomState, connected, lastEvent, setConnected, setPresence, setRoomState, setLastEvent } = useFoyerStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket(args.serverUrl);
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      setPresence({
        selfParticipantId: args.participantId,
        selfSlot: args.selfSlot,
        partnerParticipantId: args.partnerParticipantId
      });

      socket.emit('house:join', {
        houseSessionId: args.houseSessionId,
        participantId: args.participantId
      });
    };

    const onDisconnect = () => setConnected(false);
    const onState = (payload: { state: FoyerStatePayload }) => setRoomState(payload.state);
    const onEvent = (payload: FoyerEventPayload) => setLastEvent(payload);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('foyer:state', onState);
    socket.on('foyer:event', onEvent);
    socket.on('connect_error', onDisconnect);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('foyer:state', onState);
      socket.off('foyer:event', onEvent);
      socket.off('connect_error', onDisconnect);
    };
  }, [
    args.serverUrl,
    args.houseSessionId,
    args.participantId,
    args.selfSlot,
    args.partnerParticipantId,
    setConnected,
    setPresence,
    setRoomState,
    setLastEvent
  ]);

  const emitIntent = useCallback(
    (intent: FoyerIntent) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) return;

      // Frontend sends intent only; backend owns all transition decisions.
      socket.emit('foyer:intent', {
        houseSessionId: args.houseSessionId,
        participantId: args.participantId,
        intent
      });
    },
    [args.houseSessionId, args.participantId]
  );

  return { roomState, connected, lastEvent, emitIntent };
}

export function useHoldActions(emitIntent: (intent: FoyerIntent) => void): HoldActions {
  const onHoldStart = useCallback(() => emitIntent({ type: 'hold_start' }), [emitIntent]);
  const onHoldEnd = useCallback(() => emitIntent({ type: 'hold_end' }), [emitIntent]);
  return { onHoldStart, onHoldEnd };
}

export function useTypingSync(emitIntent: (intent: FoyerIntent) => void): TypingSync {
  const roomState = useFoyerStore((s) => s.roomState);
  const presence = useFoyerStore((s) => s.presence);
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [waitingForPartnerConfirm, setWaitingForPartnerConfirm] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 350);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!roomState) return;

    const myConfirmed =
      presence?.selfSlot === 'playerA' ? roomState.note.confirmations.playerA : roomState.note.confirmations.playerB;
    const partnerConfirmed =
      presence?.selfSlot === 'playerA' ? roomState.note.confirmations.playerB : roomState.note.confirmations.playerA;

    if (roomState.phase === 'NOTE_LOCKED') {
      setWaitingForPartnerConfirm(false);
      return;
    }

    setWaitingForPartnerConfirm(Boolean(myConfirmed && !partnerConfirmed));
  }, [roomState, presence?.selfSlot]);

  const partnerThinking = useMemo(() => {
    if (!roomState?.note.draftedAt || !presence?.partnerParticipantId) return false;
    if (roomState.phase !== 'NOTE_ENTRY' && roomState.phase !== 'LIT') return false;
    if (roomState.note.draftedByParticipantId !== presence.partnerParticipantId) return false;

    const draftedAtMs = new Date(roomState.note.draftedAt).getTime();
    return nowTick - draftedAtMs <= 2800;
  }, [roomState, presence?.partnerParticipantId, nowTick]);

  const updateDraft = useCallback(
    (value: string) => {
      emitIntent({ type: 'note_update', value });
    },
    [emitIntent]
  );

  const confirmDraft = useCallback(() => {
    emitIntent({ type: 'note_confirm', confirmed: true });
    setWaitingForPartnerConfirm(true);
  }, [emitIntent]);

  return {
    draft: roomState?.note.draft ?? '',
    maxChars: roomState?.note.maxChars ?? 160,
    partnerThinking,
    waitingForPartnerConfirm,
    updateDraft,
    confirmDraft
  };
}
