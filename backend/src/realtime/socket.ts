import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { DoorService } from '../rooms/door/door.service.js';
import type { FoyerService } from '../rooms/foyer/foyer.service.js';
import type { LivingRoomService } from '../rooms/living-room/presence.service.js';

export function createRealtimeServer(
  httpServer: HttpServer,
  foyerService: FoyerService,
  doorService: DoorService,
  livingRoomService: LivingRoomService
): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: '*'
    }
  });

  io.on('connection', (socket) => {
    registerSocketHandlers(io, socket, foyerService, doorService, livingRoomService).catch((error) => {
      socket.emit('system:error', { message: (error as Error).message });
    });
  });

  return io;
}

async function registerSocketHandlers(
  io: Server,
  socket: Socket,
  foyerService: FoyerService,
  doorService: DoorService,
  livingRoomService: LivingRoomService
): Promise<void> {
  socket.on('house:join', async (payload: { houseSessionId: string; participantId: string }) => {
    const { houseSessionId, participantId } = payload;

    socket.data.houseSessionId = houseSessionId;
    socket.data.participantId = participantId;
    socket.join(houseSessionId);

    await foyerService.setParticipantConnected(participantId, true);
    await livingRoomService.handleConnected(houseSessionId, participantId);

    const doorState = await doorService.snapshot(houseSessionId);
    const foyerState = await foyerService.snapshot(houseSessionId);
    const livingRoomState = await livingRoomService.snapshot(houseSessionId);

    socket.emit('door:state', doorState);
    socket.emit('foyer:state', { state: foyerState });
    socket.emit('presence_state_update', { state: livingRoomState });

    io.to(houseSessionId).emit('presence:changed', {
      participantId,
      connected: true
    });
  });

  socket.on('door_attempt', async (payload: { sessionId: string; playerId: string; input: string }) => {
    const socketSessionId = socket.data.houseSessionId as string | undefined;
    const socketPlayerId = socket.data.participantId as string | undefined;

    if (!socketSessionId || !socketPlayerId) {
      socket.emit('door_failed_attempt');
      return;
    }
    if (socketSessionId !== payload.sessionId || socketPlayerId !== payload.playerId) {
      socket.emit('door_failed_attempt');
      return;
    }

    try {
      const ok = await doorService.attemptDoorUnlock({
        houseSessionId: payload.sessionId,
        playerId: payload.playerId,
        input: payload.input
      });

      if (!ok) {
        socket.emit('door_failed_attempt');
      }
    } catch {
      socket.emit('door_failed_attempt');
    }
  });

  socket.on('foyer:intent', async (payload: { houseSessionId: string; participantId: string; intent: Record<string, unknown> }) => {
    try {
      await foyerService.applyIntent({
        houseSessionId: payload.houseSessionId,
        participantId: payload.participantId,
        intent: payload.intent as never
      });
    } catch (error) {
      socket.emit('foyer:error', { message: (error as Error).message });
    }
  });

  socket.on('sit_on_couch', async (payload: { sessionId: string; playerId: string }) => {
    await withPresenceIdentity(socket, payload, async () => {
      await livingRoomService.handleSitOnCouch(payload.sessionId, payload.playerId);
    });
  });

  socket.on('stand_up', async (payload: { sessionId: string; playerId: string }) => {
    await withPresenceIdentity(socket, payload, async () => {
      await livingRoomService.handleStandUp(payload.sessionId, payload.playerId);
    });
  });

  socket.on('interaction_detected', async (payload: { sessionId: string; playerId: string }) => {
    await withPresenceIdentity(socket, payload, async () => {
      await livingRoomService.handleInteractionDetected(payload.sessionId, payload.playerId);
    });
  });

  socket.on('disconnect', async () => {
    const houseSessionId = socket.data.houseSessionId as string | undefined;
    const participantId = socket.data.participantId as string | undefined;
    if (!houseSessionId || !participantId) return;

    await foyerService.setParticipantConnected(participantId, false);
    await livingRoomService.handleDisconnect(houseSessionId, participantId);

    io.to(houseSessionId).emit('presence:changed', {
      participantId,
      connected: false
    });
  });
}

async function withPresenceIdentity(
  socket: Socket,
  payload: { sessionId: string; playerId: string },
  action: () => Promise<void>
): Promise<void> {
  const socketSessionId = socket.data.houseSessionId as string | undefined;
  const socketPlayerId = socket.data.participantId as string | undefined;

  if (!socketSessionId || !socketPlayerId) return;
  if (socketSessionId !== payload.sessionId || socketPlayerId !== payload.playerId) return;

  await action();
}
