import { motion } from 'framer-motion';
import SceneShell from '../SceneShell';

export default function HeartbeatScene({ roomData, participants, uid, onHoldComplete }) {
  const holds = roomData?.sceneData?.heartbeatHolds || {};
  const synced = participants.length >= 2 && participants.every((id) => holds[id]);

  return (
    <SceneShell
      title="Heartbeat Sync"
      subtitle="Press and hold to sync your pulse with your partner."
    >
      <div className="flex flex-col items-center gap-6">
        <motion.div
          animate={{ scale: synced ? [1, 1.2, 1] : [1, 1.05, 1] }}
          transition={{ duration: synced ? 1.2 : 2.2, repeat: Infinity }}
          className={`h-28 w-28 rounded-full ${synced ? 'bg-rose-300/80' : 'bg-rose-200/40'} shadow-glow`}
        />
        <button
          onMouseDown={() => onHoldComplete(uid)}
          onTouchStart={() => onHoldComplete(uid)}
          className="rounded-xl border border-rose-100/40 bg-rose-100/10 px-6 py-3 text-rose-50 transition hover:bg-rose-100/20"
        >
          Hold My Heartbeat
        </button>
        <p className="text-sm text-rose-100/85">
          {synced ? 'Your hearts are in harmony.' : 'Waiting for both hearts to sync.'}
        </p>
      </div>
    </SceneShell>
  );
}