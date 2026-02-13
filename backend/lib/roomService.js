import { admin, db, timestamp } from './firebase.js';

/**
 * Generates a unique room ID (8-character alphanumeric)
 * @returns {string} Unique room ID
 */
export function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Gets room reference
 * @param {string} roomId
 * @returns {admin.firestore.DocumentReference}
 */
export function roomRef(roomId) {
  return db.collection('rooms').doc(String(roomId).toUpperCase());
}

/**
 * Creates a new room with the current user as userA
 * @param {string} uid - Current user's UID
 * @returns {Promise<{roomId: string, userRole: 'userA'}>}
 * @throws {Error} If auth fails or database error
 */
export async function createRoom(uid) {
  if (!uid) {
    throw new Error('UID is required to create a room.');
  }

  let roomId;
  let attempts = 0;
  const maxAttempts = 10;

  // Ensure unique room ID
  while (attempts < maxAttempts) {
    roomId = generateRoomId();
    const ref = roomRef(roomId);
    const snap = await ref.get();
    if (!snap.exists) {
      break;
    }
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique room ID after multiple attempts.');
  }

  const ref = roomRef(roomId);

  try {
    await ref.set({
      createdAt: timestamp(),
      createdBy: uid,
      initialScene: 'ENTRANCE',
      flowStep: 'waiting',
      sceneIndex: 0,
      sceneReady: {},
      sceneData: {
        heartbeatHolds: {},
        reveals: {},
        letters: {}
      },
      participants: {
        [uid]: {
          role: 'userA',
          joinedAt: timestamp(),
          lastSeen: timestamp()
        }
      },
      userA: uid,
      userB: null,
      roles: {}
    });

    return {
      roomId: String(roomId).toUpperCase(),
      userRole: 'userA'
    };
  } catch (error) {
    throw new Error(`Failed to create room: ${error.message}`);
  }
}

/**
 * Joins an existing room
 * Assigns userB if userA is occupied, otherwise assigns as userA if empty
 * @param {string} roomId - Room ID to join
 * @param {string} uid - User's UID
 * @returns {Promise<{roomId: string, userRole: 'userA' | 'userB', message: string}>}
 * @throws {Error} If room full, room not found, invalid roomId, or auth fails
 */
export async function joinRoom(roomId, uid) {
  if (!roomId || !uid) {
    throw new Error('roomId and uid are required.');
  }

  roomId = String(roomId).toUpperCase();
  const ref = roomRef(roomId);

  try {
    let userRole = null;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) {
        throw new Error(`Room "${roomId}" does not exist.`);
      }

      const data = snap.data() || {};
      const userA = data.userA;
      const userB = data.userB;
      const participants = data.participants || {};

      // Check if user already in room
      if (participants[uid]) {
        userRole = participants[uid].role || 'userA';
        return; // User already joined, no-op
      }

      // Check if room is full
      if (userA && userB) {
        throw new Error('Room is full. Maximum 2 participants allowed.');
      }

      // Assign role
      if (!userA) {
        userRole = 'userA';
        tx.update(ref, {
          userA: uid,
          [`participants.${uid}`]: {
            role: 'userA',
            joinedAt: timestamp(),
            lastSeen: timestamp()
          }
        });
      } else {
        userRole = 'userB';
        tx.update(ref, {
          userB: uid,
          [`participants.${uid}`]: {
            role: 'userB',
            joinedAt: timestamp(),
            lastSeen: timestamp()
          }
        });
      }
    });

    return {
      roomId: String(roomId).toUpperCase(),
      userRole: userRole,
      message: `Successfully joined as ${userRole}.`
    };
  } catch (error) {
    throw new Error(error.message || `Failed to join room: ${error.message}`);
  }
}

/**
 * Retrieves room data by ID
 * @param {string} roomId - Room ID
 * @param {string} uid - Current user's UID (for access control)
 * @returns {Promise<Object>} Room data
 * @throws {Error} If room not found or user not authorized
 */
export async function getRoomById(roomId, uid) {
  if (!roomId || !uid) {
    throw new Error('roomId and uid are required.');
  }

  roomId = String(roomId).toUpperCase();
  const ref = roomRef(roomId);

  try {
    const snap = await ref.get();

    if (!snap.exists) {
      throw new Error(`Room "${roomId}" not found.`);
    }

    const data = snap.data() || {};
    const participants = data.participants || {};

    // Verify user belongs to room
    if (!participants[uid]) {
      throw new Error('Unauthorized. You are not a participant in this room.');
    }

    return {
      roomId: String(roomId).toUpperCase(),
      ...data
    };
  } catch (error) {
    throw new Error(error.message || `Failed to retrieve room: ${error.message}`);
  }
}

/**
 * Updates room scene data
 * @param {string} roomId - Room ID
 * @param {string} uid - Current user's UID
 * @param {string} path - Path to update (e.g., 'heartbeatHolds')
 * @param {any} value - Value to set
 * @returns {Promise<{ok: boolean}>}
 * @throws {Error} If room not found or user not authorized
 */
export async function updateSceneData(roomId, uid, path, value) {
  if (!roomId || !uid || !path) {
    throw new Error('roomId, uid, and path are required.');
  }

  roomId = String(roomId).toUpperCase();
  const ref = roomRef(roomId);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) {
        throw new Error(`Room "${roomId}" not found.`);
      }

      const data = snap.data() || {};
      const participants = data.participants || {};

      if (!participants[uid]) {
        throw new Error('Unauthorized. You are not a participant in this room.');
      }

      tx.update(ref, { [`sceneData.${path}`]: value });
    });

    return { ok: true };
  } catch (error) {
    throw new Error(error.message || `Failed to update scene data: ${error.message}`);
  }
}

/**
 * Marks user as ready for scene transition
 * @param {string} roomId - Room ID
 * @param {string} uid - Current user's UID
 * @param {boolean} ready - Ready status
 * @returns {Promise<{ok: boolean}>}
 * @throws {Error} If room not found or user not authorized
 */
export async function markReady(roomId, uid, ready) {
  if (!roomId || !uid) {
    throw new Error('roomId and uid are required.');
  }

  roomId = String(roomId).toUpperCase();
  const ref = roomRef(roomId);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) {
        throw new Error(`Room "${roomId}" not found.`);
      }

      const data = snap.data() || {};
      const participants = data.participants || {};

      if (!participants[uid]) {
        throw new Error('Unauthorized. You are not a participant in this room.');
      }

      tx.update(ref, { [`sceneReady.${uid}`]: Boolean(ready) });
    });

    return { ok: true };
  } catch (error) {
    throw new Error(error.message || `Failed to mark ready: ${error.message}`);
  }
}

/**
 * Updates user presence (lastSeen)
 * @param {string} roomId - Room ID
 * @param {string} uid - Current user's UID
 * @returns {Promise<{ok: boolean}>}
 * @throws {Error} If room not found or user not authorized
 */
export async function updatePresence(roomId, uid) {
  if (!roomId || !uid) {
    throw new Error('roomId and uid are required.');
  }

  roomId = String(roomId).toUpperCase();
  const ref = roomRef(roomId);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) {
        throw new Error(`Room "${roomId}" not found.`);
      }

      const data = snap.data() || {};
      const participants = data.participants || {};

      if (!participants[uid]) {
        throw new Error('Unauthorized. You are not a participant in this room.');
      }

      tx.update(ref, { [`participants.${uid}.lastSeen`]: timestamp() });
    });

    return { ok: true };
  } catch (error) {
    throw new Error(error.message || `Failed to update presence: ${error.message}`);
  }
}

/**
 * Validates room ID format
 * @param {string} roomId - Room ID to validate
 * @returns {boolean} True if valid
 */
export function isValidRoomId(roomId) {
  if (!roomId || typeof roomId !== 'string') return false;
  const trimmed = String(roomId).trim().toUpperCase();
  return /^[A-Z0-9]{8}$/.test(trimmed);
}
