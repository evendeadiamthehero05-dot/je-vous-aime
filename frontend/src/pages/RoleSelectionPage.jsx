import { motion } from 'framer-motion';

const roles = [
  { key: 'king', title: 'King', caption: 'Steady heart, midnight charm.' },
  { key: 'queen', title: 'Queen', caption: 'Radiant soul, timeless grace.' }
];

export default function RoleSelectionPage({ roomData, uid, onSelectRole, error }) {
  const selected = roomData?.roles?.[uid];
  const taken = Object.values(roomData?.roles || {});

  return (
    <main className="flex min-h-screen items-center justify-center bg-parisNight px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="romantic-panel w-full max-w-3xl rounded-3xl p-8"
      >
        <h2 className="text-center text-3xl text-rose-50">Choose Your Role</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {roles.map((role) => {
            const unavailable = taken.includes(role.key) && selected !== role.key;
            return (
              <button
                key={role.key}
                disabled={unavailable}
                onClick={() => onSelectRole(role.key)}
                className={`rounded-2xl border p-7 text-left transition ${
                  selected === role.key
                    ? 'border-rose-100 bg-rose-100/25 shadow-glow'
                    : 'border-rose-100/30 bg-rose-100/10 hover:bg-rose-100/20'
                } ${unavailable ? 'cursor-not-allowed opacity-40' : ''}`}
              >
                <p className="text-2xl text-rose-50">{role.title}</p>
                <p className="mt-2 text-sm text-rose-100/80">{role.caption}</p>
              </button>
            );
          })}
        </div>
        <p className="mt-5 text-center text-rose-100/80">Roles sync instantly. Duplicate selection is blocked.</p>
        {error ? <p className="mt-3 text-center text-rose-200">{error}</p> : null}
      </motion.div>
    </main>
  );
}