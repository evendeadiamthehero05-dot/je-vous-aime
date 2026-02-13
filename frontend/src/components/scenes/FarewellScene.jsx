import { motion } from 'framer-motion';
import SceneShell from '../SceneShell';

export default function FarewellScene() {
  return (
    <SceneShell
      title="Farewell"
      subtitle="Until the next moonlit call, carry this evening in your heart."
    >
      <div className="text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="mx-auto max-w-xl text-lg leading-relaxed text-rose-50"
        >
          Across cities, oceans, and time zones, love stays luminous.
        </motion.p>
      </div>
    </SceneShell>
  );
}