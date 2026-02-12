import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { DoorState, DoorStatePayload, DoorUnlockPayload } from '../types/door';

type UseDoorSocketArgs = {
  serverUrl: string;
  houseSessionId: string;
  participantId: string;
};

type DoorSocketState = {
  connected: boolean;
  doorState: DoorState;
  awaitingResponse: boolean;
  failedAttemptTick: number;
  unlockedBy: string | null;
  unlockedAt: string | null;
  submitAttempt: (rawInput: string) => void;
};

const cache = new Map<string, Socket>();

function getSocket(serverUrl: string): Socket {
  const existing = cache.get(serverUrl);
  if (existing) return existing;

  const socket = io(serverUrl, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 700
  });
  cache.set(serverUrl, socket);
  return socket;
}

export function useDoorSocket(args: UseDoorSocketArgs): DoorSocketState {
  const [connected, setConnected] = useState(false);
  const [doorState, setDoorState] = useState<DoorState>('LOCKED');
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [failedAttemptTick, setFailedAttemptTick] = useState(0);
  const [unlockedBy, setUnlockedBy] = useState<string | null>(null);
  const [unlockedAt, setUnlockedAt] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket(args.serverUrl);
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit('house:join', {
        houseSessionId: args.houseSessionId,
        participantId: args.participantId
      });
    };
    const onDisconnect = () => setConnected(false);
    const onDoorState = (payload: DoorStatePayload) => {
      setDoorState(payload.state);
      setUnlockedBy(payload.unlockedBy);
      setUnlockedAt(payload.unlockedAt);
      if (payload.state !== 'LOCKED') setAwaitingResponse(false);
    };
    const onDoorUnlocked = (payload: DoorUnlockPayload) => {
      setDoorState('UNLOCKED');
      setUnlockedBy(payload.unlockedBy);
      setUnlockedAt(payload.unlockedAt);
      setAwaitingResponse(false);
    };
    const onDoorFailed = () => {
      setAwaitingResponse(false);
      setFailedAttemptTick((n) => n + 1);
    };
    const onSystemError = () => setAwaitingResponse(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('door:state', onDoorState);
    socket.on('door_unlocked', onDoorUnlocked);
    socket.on('door_failed_attempt', onDoorFailed);
    socket.on('system:error', onSystemError);
    socket.on('connect_error', onDisconnect);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('door:state', onDoorState);
      socket.off('door_unlocked', onDoorUnlocked);
      socket.off('door_failed_attempt', onDoorFailed);
      socket.off('system:error', onSystemError);
      socket.off('connect_error', onDisconnect);
    };
  }, [args.serverUrl, args.houseSessionId, args.participantId]);

  const submitAttempt = useCallback(
    (rawInput: string) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) return;
      if (doorState !== 'LOCKED') return;

      setAwaitingResponse(true);
      // Deliberately sends exact raw input; backend is the only validator.
      socket.emit('door_attempt', {
        sessionId: args.houseSessionId,
        playerId: args.participantId,
        input: rawInput
      });
    },
    [doorState, args.houseSessionId, args.participantId]
  );

  return useMemo(
    () => ({
      connected,
      doorState,
      awaitingResponse,
      failedAttemptTick,
      unlockedBy,
      unlockedAt,
      submitAttempt
    }),
    [connected, doorState, awaitingResponse, failedAttemptTick, unlockedBy, unlockedAt, submitAttempt]
  );
}
