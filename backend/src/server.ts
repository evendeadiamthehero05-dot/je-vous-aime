import 'dotenv/config';
import Fastify, { type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { ParticipantSlot } from '@prisma/client';
import { env } from './config/env.js';
import { prisma } from './plugins/prisma.js';
import { DoorService } from './rooms/door/door.service.js';
import { FoyerService } from './rooms/foyer/foyer.service.js';
import { LivingRoomService } from './rooms/living-room/presence.service.js';
import { createRealtimeServer } from './realtime/socket.js';
import { generateInviteCode } from './utils/inviteCode.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: env.corsOrigin });

let ioBroadcast: ReturnType<typeof createRealtimeServer> | null = null;
const doorService = new DoorService(prisma, (houseSessionId, payload) => {
  if (!ioBroadcast) return;
  if (payload.type === 'door_unlocked') {
    ioBroadcast.to(houseSessionId).emit('door_unlocked', payload);
  }
});

const foyerService = new FoyerService(prisma, (houseSessionId, payload) => {
  if (!ioBroadcast) return;

  if (payload.type === 'foyer:state') {
    ioBroadcast.to(houseSessionId).emit('foyer:state', { state: payload.state });
    return;
  }

  if (payload.type === 'foyer:event') {
    ioBroadcast.to(houseSessionId).emit('foyer:event', payload);
  }
});

const livingRoomService = new LivingRoomService(prisma, (houseSessionId, payload) => {
  if (!ioBroadcast) return;

  if (payload.type === 'presence_state_update') {
    ioBroadcast.to(houseSessionId).emit('presence_state_update', { state: payload.state });
    return;
  }

  if (payload.type === 'presence_progress_update') {
    ioBroadcast.to(houseSessionId).emit('presence_progress_update', payload);
    return;
  }

  if (payload.type === 'presence_completed') {
    ioBroadcast.to(houseSessionId).emit('presence_completed', payload);
  }
});

app.get('/health', async () => ({ ok: true }));

app.post('/api/houses/create', {
  schema: {
    response: {}
  }
}, async (_request, reply) => {
  return createSession(reply);
});

app.post('/api/sessions/create', {
  schema: {
    response: {}
  }
}, async (_request, reply) => {
  return createSession(reply);
});

async function createSession(reply: FastifyReply) {
  try {
    const result = await createHouseWithUniqueInvite();

    const participant = result.participants[0];
    if (!participant) {
      throw new Error('House creation failed to allocate participant slot.');
    }
    await foyerService.ensureFoyer(result.id);

    return {
      houseSessionId: result.id,
      inviteCode: result.inviteCode,
      participantId: participant.id,
      slot: participant.slot
    };
  } catch (error) {
    const message = (error as Error).message || 'Failed to create house session.';
    const statusCode = message.includes('Can\'t reach database server') ? 503 : 500;
    return reply.status(statusCode).send({
      ok: false,
      message,
      hint:
        statusCode === 503
          ? 'Start PostgreSQL on localhost:5432 and run migrations in backend/.'
          : undefined
    });
  }
}

app.post('/api/houses/join', {
  schema: {
    body: {
      type: 'object',
      properties: {
        inviteCode: { type: 'string', minLength: 4, maxLength: 12 }
      },
      required: ['inviteCode']
    },
    response: {}
  }
}, async (request, reply) => {
  const body = request.body as { inviteCode: string };

  const house = await prisma.houseSession.findUnique({
    where: { inviteCode: body.inviteCode.toUpperCase() },
    include: { participants: true }
  });

  if (!house) {
    return reply.status(404).send({ message: 'Invite code not found.' });
  }

  if (house.participants.length >= 2) {
    return reply.status(409).send({ message: 'House already has two participants.' });
  }

  const participant = await prisma.participant.create({
    data: {
      houseSessionId: house.id,
      slot: ParticipantSlot.playerB,
      connected: false
    }
  });

  await foyerService.ensureFoyer(house.id);

  return {
    houseSessionId: house.id,
    inviteCode: house.inviteCode,
    participantId: participant.id,
    slot: participant.slot
  };
});

app.get('/api/foyer/:houseSessionId/state', {
  schema: {
    params: {
      type: 'object',
      properties: {
        houseSessionId: { type: 'string' }
      },
      required: ['houseSessionId']
    }
  }
}, async (request, reply) => {
  const { houseSessionId } = request.params as { houseSessionId: string };

  try {
    const state = await foyerService.snapshot(houseSessionId);
    return { state };
  } catch {
    return reply.status(404).send({ message: 'House not found.' });
  }
});

app.get('/api/door/:houseSessionId/state', {
  schema: {
    params: {
      type: 'object',
      properties: {
        houseSessionId: { type: 'string' }
      },
      required: ['houseSessionId']
    }
  }
}, async (request, reply) => {
  const { houseSessionId } = request.params as { houseSessionId: string };

  try {
    const state = await doorService.snapshot(houseSessionId);
    return { state };
  } catch {
    return reply.status(404).send({ message: 'House not found.' });
  }
});

app.get('/api/living-room/:houseSessionId/state', {
  schema: {
    params: {
      type: 'object',
      properties: {
        houseSessionId: { type: 'string' }
      },
      required: ['houseSessionId']
    }
  }
}, async (request, reply) => {
  const { houseSessionId } = request.params as { houseSessionId: string };

  try {
    const state = await livingRoomService.snapshot(houseSessionId);
    return { state };
  } catch {
    return reply.status(404).send({ message: 'House not found.' });
  }
});

app.post('/api/foyer/intent', {
  schema: {
    body: {
      type: 'object',
      properties: {
        houseSessionId: { type: 'string' },
        participantId: { type: 'string' },
        intent: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['hold_start', 'hold_end', 'note_update', 'note_confirm'] },
            value: { type: 'string' },
            confirmed: { type: 'boolean' }
          },
          required: ['type'],
          additionalProperties: false
        }
      },
      required: ['houseSessionId', 'participantId', 'intent'],
      additionalProperties: false
    }
  }
}, async (request, reply) => {
  const body = request.body as {
    houseSessionId: string;
    participantId: string;
    intent: { type: string; value?: string; confirmed?: boolean };
  };

  try {
    const intent = normalizeIntent(body.intent);
    await foyerService.applyIntent({
      houseSessionId: body.houseSessionId,
      participantId: body.participantId,
      intent
    });
    return { ok: true };
  } catch (error) {
    return reply.status(400).send({
      ok: false,
      message: (error as Error).message
    });
  }
});

const address = await app.listen({ port: env.port, host: '0.0.0.0' });
ioBroadcast = createRealtimeServer(app.server, foyerService, doorService, livingRoomService);

app.log.info(`Backend listening at ${address}`);

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  await app.close();
  process.exit(0);
});

function normalizeIntent(intent: { type: string; value?: string; confirmed?: boolean }) {
  if (intent.type === 'hold_start') return { type: 'hold_start' } as const;
  if (intent.type === 'hold_end') return { type: 'hold_end' } as const;
  if (intent.type === 'note_update') {
    return { type: 'note_update', value: intent.value ?? '' } as const;
  }
  if (intent.type === 'note_confirm') {
    return { type: 'note_confirm', confirmed: intent.confirmed ?? true } as const;
  }
  throw new Error('Unsupported intent.');
}

async function createHouseWithUniqueInvite() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();

    try {
      return await prisma.$transaction(async (tx) => {
        const house = await tx.houseSession.create({
          data: {
            inviteCode,
            participants: {
              create: [{ slot: ParticipantSlot.playerA, connected: false }]
            }
          },
          include: { participants: true }
        });

        await tx.foyerState.create({
          data: {
            houseSessionId: house.id,
            notePrompt: "When I'm breaking down, I need you to say..."
          }
        });

        return house;
      });
    } catch (error) {
      const msg = (error as Error).message || '';
      if (!msg.toLowerCase().includes('unique')) throw error;
    }
  }

  throw new Error('Unable to generate unique invite code.');
}
