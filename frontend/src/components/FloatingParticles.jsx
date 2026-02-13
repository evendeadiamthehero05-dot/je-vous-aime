import { motion } from 'framer-motion';

/**
 * Floating Particles Component
 * 
 * Creates subtle, drifting light particles for a dreamy romantic ambiance
 * - Fade in/out with gentle floating motion
 * - Varied sizes and timings for natural feel
 * - Responsive particle count
 */
function randomStyle(index) {
  const size = 3 + (index % 5); // 3-7px for subtle effect
  const left = (index * 7.7) % 100;
  const duration = 12 + (index % 8) * 2; // 12-18 second drift
  const delay = (index % 12) * 0.4;
  const opacity = 0.3 + (index % 3) * 0.2; // 0.3-0.7 for subtlety
  return { size, left, duration, delay, opacity };
}

export default function FloatingParticles({ count = 28 }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const { size, left, duration, delay, opacity } = randomStyle(i);
        return (
          <motion.span
            key={i}
            className="absolute rounded-full bg-gradient-to-b from-pink-200 to-rose-200"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              bottom: '-8%',
              filter: 'blur(0.5px)',
            }}
            animate={{
              y: ['0%', '-130vh'],
              opacity: [0, opacity, opacity * 0.6, 0],
              x: [0, (Math.random() - 0.5) * 40, 0],
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay,
            }}
          />
        );
      })}
    </div>
  );
}