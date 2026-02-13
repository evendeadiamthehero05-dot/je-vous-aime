import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { io } from 'socket.io-client';

const SECRET = 'communication';

export default function EntrancePage({ onUnlock }) {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [locked, setLocked] = useState(true);
  const socketRef = useRef(null);
  const doorControls = useAnimation();
  const glowControls = useAnimation();

  useEffect(() => {
    const backend = import.meta.env.VITE_BACKEND_URL || window.location.origin;
    const url = typeof backend === 'string' ? backend.replace(/\/+$/, '') : '';
    const socket = io(url, { autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('createRoom', (res) => {
        if (res?.roomId) setRoomId(res.roomId);
      });
    });

    socket.on('roomUpdated', (room) => {
      setLocked(Boolean(room.locked));
    });

    socket.on('wrongKey', () => {
      setFeedback('Not quite...');
      // door shake
      doorControls.start({ x: [0, -8, 8, -6, 4, 0], rotate: [0, -1, 1, -0.6, 0.4, 0] }, { duration: 0.9, ease: 'easeInOut' });
    });

    socket.on('doorUnlocked', ({ unlockedBy }) => {
      setFeedback('The door yields...');
      glowControls.start({ boxShadow: '0 0 60px rgba(255,225,200,0.9)' });
      doorControls.start({ scale: 1.02 }, { duration: 0.8 }).then(() => {
        // open animation
        doorControls.start({ rotateY: -20, x: -40, opacity: 0.98 }, { duration: 1.4, ease: [0.2,0.7,0.2,1] }).then(() => {
          if (typeof onUnlock === 'function') onUnlock();
        });
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  function submitKey() {
    const val = String(input || '').trim();
    if (!val) return setFeedback('Type the key...');
    // emit to server for validation
    const socket = socketRef.current;
    if (!socket || !roomId) return setFeedback('Connecting...');

    socket.emit('validateKey', { roomId, typedKey: val }, (ack) => {
      if (ack && ack.error === 'alreadyUnlocked') setFeedback('Already unlocked.');
      if (ack && ack.error === 'invalidRoom') setFeedback('Room not found.');
    });
    setFeedback('Listening...');
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-rose-900 via-rose-800 to-rose-950 px-6 text-rose-50">
      {/* Soft floating particles */}
      <motion.div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.18 }}
          transition={{ duration: 4, repeat: Infinity, repeatType: 'mirror' }}
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,200,220,0.06),_transparent_30%),radial-gradient(ellipse_at_bottom_left,_rgba(255,100,120,0.04),_transparent_30%)]"
        />
      </motion.div>

      <div className="z-10 flex w-full max-w-4xl items-center justify-center">
        <div className="relative flex w-full items-center justify-center gap-12 px-4 py-16">
          {/* Door Column */}
          <motion.div
            animate={doorControls}
            className="flex flex-col items-center gap-6"
          >
            <motion.div
              animate={glowControls}
              initial={{ boxShadow: '0 0 12px rgba(255,180,200,0.08)' }}
              className="relative flex h-[420px] w-[260px] items-center justify-center rounded-3xl bg-gradient-to-b from-rose-900/60 via-rose-800/40 to-rose-700/30 p-6"
              style={{ perspective: 800 }}
            >
              <div className="absolute inset-0 rounded-2xl border border-rose-700/40" />
              {/* Door face */}
              <div className="relative h-full w-full rounded-2xl bg-gradient-to-b from-rose-800 to-rose-600/90 p-6">
                <div className="absolute left-6 top-12 h-10 w-10 rounded-full bg-rose-50/8 shadow-inner" />
                <div className="absolute right-6 top-12 h-2 w-12 rounded bg-rose-200/6" />
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 h-28 w-16 rounded-b-2xl bg-gradient-to-b from-rose-500/50 to-pink-400/20" />
              </div>
            </motion.div>

            <motion.div className="w-72 text-center">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.2 }}
                className="mb-3 text-lg leading-relaxed"
              >
                <span className="italic">Every great love story opens with a key…</span>
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.4 }}
                className="text-sm text-rose-200/90"
              >
                …yours is <strong className="text-rose-50">communication</strong>.
              </motion.p>
            </motion.div>
          </motion.div>

          {/* Input Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
            className="w-[420px] rounded-3xl bg-black/30 p-8 backdrop-blur-md"
          >
            <label className="mb-3 block text-sm uppercase tracking-widest text-rose-200/70">Whisper the Key</label>
            <div className="flex items-center gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitKey()}
                placeholder="Type the key…"
                className="flex-1 rounded-xl bg-rose-900/30 px-4 py-3 text-rose-50 placeholder-rose-300/40 outline-none transition focus:shadow-[0_0_18px_rgba(255,200,200,0.14)]"
              />
              <button
                onClick={submitKey}
                className="rounded-xl bg-gradient-to-b from-rose-600 to-rose-500 px-5 py-2 text-sm font-semibold text-rose-950 shadow-sm"
              >
                Try
              </button>
            </div>

            <div className="mt-4 min-h-[28px]">
              {feedback ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-rose-200">
                  {feedback}
                </motion.div>
              ) : (
                <div className="text-sm text-rose-300/50">The door listens for a single word.</div>
              )}
            </div>

            <div className="mt-6">
              <div className="text-xs text-rose-300/40">Room: {roomId || 'connecting…'}</div>
              <div className="text-xs text-rose-300/30">Status: {locked ? 'Locked' : 'Unlocked'}</div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}