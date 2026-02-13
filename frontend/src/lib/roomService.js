import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

async function api(path, body, method = 'POST') {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.');
  }

  return payload;
}

export function roomRef(roomId) {
  return doc(db, 'rooms', roomId.toUpperCase());
}

export function subscribeRoom(roomId, callback) {
  return onSnapshot(roomRef(roomId), (snapshot) => {
    callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
  });
}

export async function createRoom(uid) {
  const result = await api('/rooms/create', { uid });
  return {
    roomId: result.roomId,
    userRole: result.userRole
  };
}

export async function joinRoom(roomId, uid) {
  const result = await api('/rooms/join', { roomId, uid });
  return {
    roomId: result.roomId,
    userRole: result.userRole,
    message: result.message
  };
}

export async function verifyRoom(roomId) {
  const local = await getDoc(roomRef(roomId));
  if (local.exists()) {
    return true;
  }

  const res = await fetch(`${API_BASE_URL}/rooms/${String(roomId).toUpperCase()}/exists`);
  if (!res.ok) {
    return false;
  }
  const payload = await res.json();
  return Boolean(payload.exists);
}

export function isParticipantOnline(participant) {
  if (!participant?.lastSeen?.toDate) {
    return false;
  }
  const ageMs = Date.now() - participant.lastSeen.toDate().getTime();
  return ageMs < 20000;
}

export async function heartbeatPresence(roomId, uid) {
  await api('/rooms/presence', { roomId, uid });
}

export async function continueToRoles(roomId) {
  await api('/rooms/continue', { roomId });
}

export async function chooseRole(roomId, uid, role) {
  await api('/rooms/role', { roomId, uid, role });
}

export async function updateSceneData(roomId, uid, path, value) {
  return await api('/rooms/scene-data', { roomId, uid, path, value });
}

export async function setReady(roomId, uid, ready = true) {
  await api('/rooms/ready', { roomId, uid, ready });
}

export function bothUsersReady(roomData) {
  const participants = Object.keys(roomData?.participants || {});
  if (participants.length < 2) {
    return false;
  }
  const ready = roomData.sceneReady || {};
  return participants.every((uid) => ready[uid]);
}

export async function advanceSceneIfReady(roomId, maxSceneIndex) {
  return await api('/rooms/advance', { roomId, maxSceneIndex });
}

/**
 * Health check to verify backend is running
 * @returns {Promise<{ok: boolean}>}
 */
export async function healthCheck() {
  try {
    return await api('/health', {}, 'GET');
  } catch {
    return { ok: false };
  }
}

/**
 * Error categorization helper for UI error handling
 * @param {Error} error - Error thrown from room service
 * @returns {string} Error category for handling
 * 
 * Categories:
 * - 'invalid_room' - Room ID format invalid
 * - 'room_full' - Maximum participants reached
 * - 'room_not_found' - Room doesn't exist
 * - 'unauthorized' - User not authorized for action
 * - 'auth_required' - Authentication needed
 * - 'unknown' - Other error
 */
export function categorizeError(error) {
  const msg = (error?.message || '').toLowerCase();

  if (msg.includes('format') || msg.includes('invalid')) {
    return 'invalid_room';
  }
  if (msg.includes('full')) {
    return 'room_full';
  }
  if (msg.includes('not found') || msg.includes('does not exist')) {
    return 'room_not_found';
  }
  if (msg.includes('unauthorized') || msg.includes('participant')) {
    return 'unauthorized';
  }
  if (msg.includes('auth') || msg.includes('user id is required')) {
    return 'auth_required';
  }

  return 'unknown';
}