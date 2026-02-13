import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { admin } from './lib/firebase.js';
import {
  generateRoomId,
  roomRef,
  createRoom,
  joinRoom,
  getRoomById,
  updateSceneData,
  markReady,
  updatePresence,
  isValidRoomId
} from './lib/roomService.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const db = admin.firestore();
const timestamp = admin.firestore.FieldValue.serverTimestamp;

app.use(cors({ origin: frontendOrigin }));
app.use(express.json());

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/rooms/:roomId/exists', async (req, res) => {
  const snap = await roomRef(req.params.roomId).get();
  res.json({ exists: snap.exists });
});

app.post('/rooms/create', async (req, res) => {
  try {
    const { uid } = req.body || {};
    if (!uid) {
      return res.status(400).json({ error: 'uid is required.' });
    }

    const result = await createRoom(uid);
    return res.status(201).json(result);
  } catch (error) {
    const status = error.message.includes('UID is required') ? 400 : 500;
    return res.status(status).json({ error: error.message || 'Failed to create room.' });
  }
});

app.post('/rooms/join', async (req, res) => {
  try {
    const { roomId, uid } = req.body || {};
    if (!roomId || !uid) {
      return res.status(400).json({ error: 'roomId and uid are required.' });
    }

    if (!isValidRoomId(roomId)) {
      return res.status(400).json({ error: 'Invalid roomId format. Must be 8 alphanumeric characters.' });
    }

    const result = await joinRoom(roomId, uid);
    return res.json(result);
  } catch (error) {
    let status = 500;
    if (error.message.includes('does not exist')) {
      status = 404;
    } else if (error.message.includes('full')) {
      status = 409;
    } else if (error.message.includes('required')) {
      status = 400;
    }
    return res.status(status).json({ error: error.message || 'Failed to join room.' });
  }
});

app.get('/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const uid = req.query.uid || req.headers['x-user-id'];

    if (!uid) {
      return res.status(401).json({ error: 'User ID is required. Pass as ?uid=<uid> or X-User-Id header.' });
    }

    const result = await getRoomById(roomId, uid);
    return res.json(result);
  } catch (error) {
    let status = 500;
    if (error.message.includes('not found')) {
      status = 404;
    } else if (error.message.includes('Unauthorized')) {
      status = 403;
    } else if (error.message.includes('required')) {
      status = 400;
    }
    return res.status(status).json({ error: error.message || 'Failed to retrieve room.' });
  }
});

app.post('/rooms/continue', async (req, res) => {
  const { roomId } = req.body || {};
  if (!roomId) {
    return res.status(400).json({ error: 'roomId is required.' });
  }

  await roomRef(roomId).update({ flowStep: 'role' });
  return res.json({ ok: true });
});

app.post('/rooms/role', async (req, res) => {
  const { roomId, uid, role } = req.body || {};
  if (!roomId || !uid || !role) {
    return res.status(400).json({ error: 'roomId, uid, role are required.' });
  }

  const normalized = normalizeRole(role);
  const ref = roomRef(roomId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new Error('Room not found.');
    }

    const data = snap.data() || {};
    const roles = data.roles || {};
    const taken = Object.values(roles);

    if (roles[uid] && roles[uid] !== normalized) {
      throw new Error('Role already selected.');
    }

    if (!roles[uid] && taken.includes(normalized)) {
      throw new Error('Role already taken.');
    }

    tx.update(ref, { [`roles.${uid}`]: normalized });

    const nextRoles = { ...roles, [uid]: normalized };
    const uniqueRoleCount = new Set(Object.values(nextRoles)).size;
    if (Object.keys(nextRoles).length >= 2 && uniqueRoleCount >= 2) {
      tx.update(ref, { flowStep: 'experience' });
    }
  });

  return res.json({ ok: true });
});

app.post('/rooms/scene-data', async (req, res) => {
  try {
    const { roomId, uid, path, value } = req.body || {};
    if (!roomId || !uid || !path) {
      return res.status(400).json({ error: 'roomId, uid, and path are required.' });
    }

    const result = await updateSceneData(roomId, uid, path, value);
    return res.json(result);
  } catch (error) {
    let status = 500;
    if (error.message.includes('not found')) {
      status = 404;
    } else if (error.message.includes('Unauthorized')) {
      status = 403;
    } else if (error.message.includes('required')) {
      status = 400;
    }
    return res.status(status).json({ error: error.message || 'Failed to update scene data.' });
  }
});

app.post('/rooms/ready', async (req, res) => {
  try {
    const { roomId, uid, ready } = req.body || {};
    if (!roomId || !uid) {
      return res.status(400).json({ error: 'roomId and uid are required.' });
    }

    const result = await markReady(roomId, uid, ready);
    return res.json(result);
  } catch (error) {
    let status = 500;
    if (error.message.includes('not found')) {
      status = 404;
    } else if (error.message.includes('Unauthorized')) {
      status = 403;
    } else if (error.message.includes('required')) {
      status = 400;
    }
    return res.status(status).json({ error: error.message || 'Failed to mark ready.' });
  }
});

app.post('/rooms/presence', async (req, res) => {
  try {
    const { roomId, uid } = req.body || {};
    if (!roomId || !uid) {
      return res.status(400).json({ error: 'roomId and uid are required.' });
    }

    const result = await updatePresence(roomId, uid);
    return res.json(result);
  } catch (error) {
    let status = 500;
    if (error.message.includes('not found')) {
      status = 404;
    } else if (error.message.includes('Unauthorized')) {
      status = 403;
    } else if (error.message.includes('required')) {
      status = 400;
    }
    return res.status(status).json({ error: error.message || 'Failed to update presence.' });
  }
});

app.post('/rooms/advance', async (req, res) => {
  const { roomId, maxSceneIndex } = req.body || {};
  if (!roomId || typeof maxSceneIndex !== 'number') {
    return res.status(400).json({ error: 'roomId and numeric maxSceneIndex are required.' });
  }

  const ref = roomRef(roomId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new Error('Room not found.');
    }

    const data = snap.data() || {};
    const participants = Object.keys(data.participants || {});
    const ready = data.sceneReady || {};
    const allReady = participants.length >= 2 && participants.every((id) => ready[id]);

    if (!allReady) {
      return;
    }

    const current = data.sceneIndex || 0;
    const next = current + 1;

    if (next > maxSceneIndex) {
      tx.update(ref, { flowStep: 'completed', sceneReady: {} });
      return;
    }

    tx.update(ref, { sceneIndex: next, sceneReady: {} });
  });

  return res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  const status = /not found|does not exist|already/.test((err?.message || '').toLowerCase()) ? 400 : 500;
  res.status(status).json({ error: err?.message || 'Server error.' });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err?.stack || err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err?.stack || err);
});

import http from 'http';
import { Server as IOServer } from 'socket.io';

// In-memory entrance room store for the locked-door ritual
const entranceRooms = Object.create(null);

function makeEntranceRoom(roomId, ownerSocketId) {
  return {
    roomId,
    locked: true,
    unlockedBy: null,
    users: [ownerSocketId],
    scene: 'ENTRANCE'
  };
}

function findRoomBySocket(socketId) {
  return Object.values(entranceRooms).find((r) => r.users.includes(socketId));
}

const server = http.createServer(app);

const io = new IOServer(server, {
  cors: { origin: frontendOrigin }
});

// Express route to inspect entrance room state (simple read-only)
app.get('/entrance/:roomId', (req, res) => {
  const roomId = String(req.params.roomId || '').toUpperCase();
  const room = entranceRooms[roomId];
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  return res.json(room);
});

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('createRoom', (cb) => {
    let roomId;
    let attempts = 0;
    do {
      roomId = generateRoomId();
      attempts++;
    } while (entranceRooms[roomId] && attempts < 10);

    if (entranceRooms[roomId]) {
      const err = 'Failed to generate unique room ID.';
      console.error(err);
      if (typeof cb === 'function') cb({ error: err });
      return;
    }

    const room = makeEntranceRoom(roomId, socket.id);
    entranceRooms[roomId] = room;
    socket.join(roomId);
    console.log(`Created entrance room ${roomId} by ${socket.id}`);
    if (typeof cb === 'function') cb({ ok: true, roomId });
    io.to(roomId).emit('roomUpdated', room);
  });

  socket.on('joinRoom', (roomIdRaw, cb) => {
    const roomId = String(roomIdRaw || '').toUpperCase();
    const room = entranceRooms[roomId];
    if (!room) {
      if (typeof cb === 'function') cb({ error: 'invalidRoom' });
      return;
    }

    if (room.users.includes(socket.id)) {
      socket.join(roomId);
      if (typeof cb === 'function') cb({ ok: true, room });
      return;
    }

    if (room.users.length >= 2) {
      if (typeof cb === 'function') cb({ error: 'roomFull' });
      return;
    }

    room.users.push(socket.id);
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);
    if (typeof cb === 'function') cb({ ok: true, room });
    io.to(roomId).emit('roomUpdated', room);
  });

  socket.on('validateKey', (data, cb) => {
    try {
      const { roomId: rawId, typedKey } = data || {};
      const roomId = String(rawId || '').toUpperCase();
      const room = entranceRooms[roomId];

      if (!room) {
        if (typeof cb === 'function') cb({ error: 'invalidRoom' });
        return;
      }

      if (!room.users.includes(socket.id)) {
        if (typeof cb === 'function') cb({ error: 'notInRoom' });
        return;
      }

      const normalized = String(typedKey || '').trim().toLowerCase();
      const secret = 'communication';

      if (!room.locked) {
        if (typeof cb === 'function') cb({ error: 'alreadyUnlocked' });
        return;
      }

      if (normalized === secret) {
        room.locked = false;
        room.unlockedBy = socket.id;
        room.scene = 'ROOM_SETUP';
        io.to(roomId).emit('doorUnlocked', { unlockedBy: socket.id });
        io.to(roomId).emit('roomUpdated', room);
        if (typeof cb === 'function') cb({ ok: true });
        console.log(`Room ${roomId} unlocked by ${socket.id}`);
        return;
      }

      // Wrong key
      socket.emit('wrongKey');
      if (typeof cb === 'function') cb({ ok: false });
    } catch (err) {
      console.error('validateKey error', err);
      if (typeof cb === 'function') cb({ error: 'serverError' });
    }
  });

  socket.on('disconnect', () => {
    const room = findRoomBySocket(socket.id);
    if (room) {
      room.users = room.users.filter((s) => s !== socket.id);
      io.to(room.roomId).emit('roomUpdated', room);
      console.log(`${socket.id} disconnected from ${room.roomId}`);
      // Clean up empty rooms
      if (room.users.length === 0) {
        delete entranceRooms[room.roomId];
        console.log(`Deleted empty entrance room ${room.roomId}`);
      }
    }
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening on http://0.0.0.0:${port}`);
});