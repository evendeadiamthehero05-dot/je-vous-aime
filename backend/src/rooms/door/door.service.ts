import { DoorState, ParticipantSlot, PrismaClient } from '@prisma/client';

export const DOOR_KEY_EXACT = 'communication';

type DoorBroadcast = (houseSessionId: string, payload: { type: string; [key: string]: unknown }) => void;

export class DoorService {
  private readonly prisma: PrismaClient;
  private readonly broadcast: DoorBroadcast;

  constructor(prismaClient: PrismaClient, broadcast: DoorBroadcast) {
    this.prisma = prismaClient;
    this.broadcast = broadcast;
  }

  async snapshot(houseSessionId: string): Promise<{ state: DoorState; unlockedBy: string | null; unlockedAt: string | null }> {
    const house = await this.prisma.houseSession.findUnique({
      where: { id: houseSessionId },
      select: { doorState: true, doorUnlockedBy: true, doorUnlockedAt: true }
    });

    if (!house) throw new Error('Invalid session.');
    return {
      state: house.doorState,
      unlockedBy: house.doorUnlockedBy,
      unlockedAt: house.doorUnlockedAt?.toISOString() ?? null
    };
  }

  async attemptDoorUnlock(params: { houseSessionId: string; playerId: string; input: string }): Promise<boolean> {
    const { houseSessionId, playerId, input } = params;

    const house = await this.prisma.houseSession.findUnique({
      where: { id: houseSessionId },
      include: { participants: true }
    });

    if (!house) {
      // Unknown sessions are rejected with no hint to preserve gate strictness.
      return false;
    }

    if (house.participants.length !== 2) return false;
    const hasA = house.participants.some((p) => p.slot === ParticipantSlot.playerA);
    const hasB = house.participants.some((p) => p.slot === ParticipantSlot.playerB);
    if (!hasA || !hasB) return false;

    const me = house.participants.find((p) => p.id === playerId);
    if (!me) return false;

    const bothConnected = house.participants.every((p) => p.connected);
    if (!bothConnected) return false;

    if (house.doorState !== DoorState.LOCKED) return false;

    // No normalization is applied by design. Exact bytes must match the required key.
    if (input !== DOOR_KEY_EXACT) return false;

    const unlockedAt = new Date();

    // Atomic compare-and-set prevents race-based double unlocks.
    const result = await this.prisma.houseSession.updateMany({
      where: {
        id: houseSessionId,
        doorState: DoorState.LOCKED,
        doorUnlockedAt: null
      },
      data: {
        doorState: DoorState.UNLOCKED,
        doorUnlockedBy: playerId,
        doorUnlockedAt: unlockedAt
      }
    });

    if (result.count !== 1) {
      return false;
    }

    // Foyer is prepared here, but there is intentionally no automatic room transition.
    await this.prisma.foyerState.upsert({
      where: { houseSessionId },
      update: {},
      create: {
        houseSessionId,
        notePrompt: "When I'm breaking down, I need you to sayâ€¦"
      }
    });

    this.broadcast(houseSessionId, {
      type: 'door_unlocked',
      sessionId: houseSessionId,
      unlockedBy: playerId,
      unlockedAt: unlockedAt.toISOString(),
      state: DoorState.UNLOCKED
    });

    return true;
  }
}

