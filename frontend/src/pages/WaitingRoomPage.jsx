import { motion } from 'framer-motion';

export default function WaitingRoomPage({ roomId, participants, onlineCount, onContinue }) {
  const canContinue = participants.length >= 2;

  return (
    <main className="flex min-h-screen items-center justify-center bg-parisNight px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="romantic-panel w-full max-w-2xl rounded-3xl p-8"
      >
        <p className="text-center text-sm uppercase tracking-[0.25em] text-rose-200/80">Room {roomId}</p>
        <h2 className="mt-2 text-center text-3xl text-rose-50">Waiting for your partner...</h2>
        <p className="mt-3 text-center text-rose-100/80">Live presence: {onlineCount}/{participants.length || 1} online</p>

        <div className="mt-7 space-y-3">
          {participants.map(({ uid, online }, index) => (
            <div key={uid} className="flex items-center justify-between rounded-xl border border-rose-100/25 bg-rose-100/10 px-4 py-3">
              <span className="text-rose-50">Soul {index + 1}</span>
              <span className={`text-sm ${online ? 'text-emerald-300' : 'text-rose-200/70'}`}>
                {online ? 'Connected' : 'Quiet'}
              </span>
            </div>
          ))}
        </div>

        {canContinue ? (
          <button
            onClick={onContinue}
            className="mt-8 w-full rounded-xl bg-rose-100/20 px-4 py-3 text-rose-50 transition hover:bg-rose-100/30"
          >
            Continue
          </button>
        ) : null}
      </motion.div>
    </main>
  );
}