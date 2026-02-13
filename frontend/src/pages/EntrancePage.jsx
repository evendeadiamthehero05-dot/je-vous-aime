import { useState } from 'react';
import { motion } from 'framer-motion';

export default function EntrancePage({ onUnlock }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  function handleUnlock() {
    if (key.trim().toLowerCase() !== 'communication') {
      setError('The door listens for the right word.');
      return;
    }
    setError('');
    onUnlock();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-parisNight px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="romantic-panel w-full max-w-xl rounded-3xl p-8 shadow-glow"
      >
        <div className="mb-7 rounded-2xl border border-rose-100/20 bg-black/20 p-8 text-center">
          <div className="mx-auto mb-6 h-28 w-20 rounded-t-full border border-rose-100/40 bg-gradient-to-b from-rose-200/10 to-rose-500/10" />
          <p className="text-lg text-rose-100/95">Every great love story opens with a key... yours is communication.</p>
        </div>
        <label className="mb-2 block text-sm uppercase tracking-[0.2em] text-rose-200/80">Whisper The Key</label>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full rounded-xl border border-rose-100/35 bg-rose-950/35 px-4 py-3 text-rose-50 outline-none transition focus:border-rose-200"
          placeholder="Type the key"
        />
        {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
        <button
          onClick={handleUnlock}
          className="mt-6 w-full rounded-xl bg-rose-100/20 px-4 py-3 text-rose-50 transition hover:bg-rose-100/30"
        >
          Unlock The Door
        </button>
      </motion.div>
    </main>
  );
}