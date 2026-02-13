import { useState } from 'react';
import { motion } from 'framer-motion';

function makeRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let roomId = '';
  for (let i = 0; i < 6; i += 1) {
    roomId += chars[Math.floor(Math.random() * chars.length)];
  }
  return roomId;
}

export default function RoomPage({ onCreateRoom, onJoinRoom, error }) {
  const [roomInput, setRoomInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    await onCreateRoom(makeRoomId());
    setLoading(false);
  }

  async function handleJoin() {
    if (!roomInput.trim()) {
      return;
    }
    setLoading(true);
    await onJoinRoom(roomInput.trim().toUpperCase());
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-parisNight px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="romantic-panel w-full max-w-2xl rounded-3xl p-8"
      >
        <h2 className="mb-6 text-center text-3xl text-rose-50">Choose Your Private Salon</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="rounded-2xl border border-rose-100/30 bg-rose-100/10 p-6 text-left transition hover:bg-rose-100/20"
          >
            <p className="mb-2 text-xl">Create Room</p>
            <p className="text-sm text-rose-100/80">Generate a Room ID and invite your partner.</p>
          </button>
          <div className="rounded-2xl border border-rose-100/30 bg-rose-100/10 p-6">
            <p className="mb-3 text-xl">Join Room</p>
            <input
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-rose-100/35 bg-rose-950/35 px-3 py-2 text-rose-50 outline-none"
              placeholder="Room ID"
              maxLength={8}
            />
            <button
              onClick={handleJoin}
              disabled={loading}
              className="mt-3 w-full rounded-lg bg-rose-100/20 px-3 py-2 transition hover:bg-rose-100/30"
            >
              Enter Room
            </button>
          </div>
        </div>
        {error ? <p className="mt-4 text-center text-rose-200">{error}</p> : null}
      </motion.div>
    </main>
  );
}