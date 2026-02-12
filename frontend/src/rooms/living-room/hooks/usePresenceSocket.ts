import { useCallback, useEffect, useMemo, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { usePresenceStore } from '../store/presenceStore';
import type {
  PresenceChanged,
  PresenceCompleted,
  PresenceProgressUpdate,
  PresenceStatePayload
} from '../types/presence';

type PresenceRoomArgs = {
  serverUrl: string;
  houseSessionId: string;
  participantId: string;
  selfSlot: 'playerA' | 'playerB';
  partnerParticipantId: string;
};

type PresenceActions = {
  emitSit: () => void;
  emitInteraction: () => void;
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

export function usePresenceSocket(args: PresenceRoomArgs): PresenceActions {
  const {
    setConnected,
    setPresence,
    setRoomState,
    setPartnerConnected,
    setLastProgress,
    setLastCompleted
  } = usePresenceStore();
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
    const onState = (payload: { state: PresenceStatePayload }) => setRoomState(payload.state);
    const onProgress = (payload: PresenceProgressUpdate) => setLastProgress(payload);
    const onCompleted = (payload: PresenceCompleted) => setLastCompleted(payload);
    const onPresenceChanged = (payload: PresenceChanged) => {
      if (payload.participantId === args.partnerParticipantId) {
        setPartnerConnected(payload.connected);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('presence_state_update', onState);
    socket.on('presence_progress_update', onProgress);
    socket.on('presence_completed', onCompleted);
    socket.on('presence:changed', onPresenceChanged);
    socket.on('connect_error', onDisconnect);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('presence_state_update', onState);
      socket.off('presence_progress_update', onProgress);
      socket.off('presence_completed', onCompleted);
      socket.off('presence:changed', onPresenceChanged);
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
    setPartnerConnected,
    setLastProgress,
    setLastCompleted
  ]);

  const emitSit = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    // Backend remains the authority; frontend merely expresses intent.
    socket.emit('sit_on_couch', {
      sessionId: args.houseSessionId,
      playerId: args.participantId
    });
  }, [args.houseSessionId, args.participantId]);

  const emitInteraction = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    // Any off-couch interaction is treated as movement.
    socket.emit('interaction_detected', {
      sessionId: args.houseSessionId,
      playerId: args.participantId
    });
  }, [args.houseSessionId, args.participantId]);

  return useMemo(() => ({ emitSit, emitInteraction }), [emitSit, emitInteraction]);
}
