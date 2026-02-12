import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

type RoomTransitionLoaderProps = {
  // Provide the heart-hourglass image URL from the hosting layer or assets bundle.
  // Example: imageSrc={heartHourglassPng}
  imageSrc: string;
  // When true, triggers the gentle exit sequence into the next room.
  ready?: boolean;
  // Optional callback after exit finishes.
  onExited?: () => void;
  // Optional rotating messages; if omitted, defaults to romantic phrases.
  messages?: string[];
};

const romanticEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

export function RoomTransitionLoader(props: RoomTransitionLoaderProps) {
  const messages = useMemo(
    () =>
      props.messages ?? [
        'Hold on to this moment...',
        'Love takes its time.',
        'Stay with me...',
        'Every second with you matters.',
        'We’re moving forward together.'
      ],
    [props.messages]
  );

  const [messageIndex, setMessageIndex] = useState(0);
  const [glowRise, setGlowRise] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [messages.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGlowRise((prev) => (prev >= 1 ? 0 : Math.min(1, prev + 0.08)));
    }, 1400);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <motion.section
      aria-label="Room transition"
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(160deg, #f7c7d9 0%, #f5a48f 48%, #f29aa8 100%)',
        color: '#fff8f2'
      }}
      animate={{
        scale: [1, 1.02, 1],
        filter: `saturate(${0.95 + glowRise * 0.1}) brightness(${0.95 + glowRise * 0.1})`
      }}
      transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <RomanticBackground glowRise={glowRise} exiting={Boolean(props.ready)} />
      <FloatingParticles intensity={glowRise} />

      <motion.div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'grid',
          gap: '1.4rem',
          placeItems: 'center',
          textAlign: 'center',
          width: 'min(480px, 92vw)'
        }}
      >
        <HeartHourglass imageSrc={props.imageSrc} exiting={Boolean(props.ready)} />

        <RotatingMessage key={messageIndex} message={messages[messageIndex]} exiting={Boolean(props.ready)} />
      </motion.div>

      <AnimatePresence onExitComplete={props.onExited}>
        {props.ready && (
          <motion.div
            key="exit-shimmer"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.8, ease: romanticEase }}
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none'
            }}
          >
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '-40%',
                width: '70%',
                background:
                  'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,236,204,0.6), rgba(255,255,255,0))',
                filter: 'blur(8px)'
              }}
              animate={{ x: ['0%', '170%'] }}
              transition={{ duration: 2.6, ease: romanticEase }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Placeholder for a soft romantic chime on exit, triggered externally if desired. */}
    </motion.section>
  );
}

function RomanticBackground(props: { glowRise: number; exiting: boolean }) {
  return (
    <>
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 85% at 50% 15%, rgba(255,247,229,0.6), rgba(255,247,229,0) 60%)'
        }}
        animate={{ opacity: 0.5 + props.glowRise * 0.35 }}
        transition={{ duration: 2.8, ease: romanticEase }}
      />

      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(140% 90% at 50% 85%, rgba(255,182,162,0.4), rgba(0,0,0,0) 70%)'
        }}
        animate={{ opacity: props.exiting ? 0.75 : 0.55 + props.glowRise * 0.2 }}
        transition={{ duration: 2.8, ease: romanticEase }}
      />

      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 45%, rgba(123,63,70,0.35) 80%, rgba(84,41,53,0.5) 100%)'
        }}
        animate={{ opacity: props.exiting ? 0.2 : 0.35 }}
        transition={{ duration: 2.6, ease: romanticEase }}
      />
    </>
  );
}

function HeartHourglass(props: { imageSrc: string; exiting: boolean }) {
  return (
    <motion.div
      style={{
        width: 'min(240px, 60vw)',
        height: 'min(360px, 70vw)',
        display: 'grid',
        placeItems: 'center',
        position: 'relative'
      }}
      animate={{
        y: [0, -10, 0],
        rotate: [-1.5, 1.5, -1.5]
      }}
      transition={{ duration: 5.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        style={{
          position: 'absolute',
          inset: '-12% -14%',
          borderRadius: '40%',
          background:
            'radial-gradient(50% 50% at 50% 50%, rgba(255,241,211,0.65), rgba(255,209,167,0.2) 60%, rgba(255,255,255,0) 75%)',
          filter: 'blur(8px)'
        }}
        animate={{ opacity: props.exiting ? [0.6, 1, 0.2] : [0.4, 0.8, 0.4] }}
        transition={{ duration: props.exiting ? 2.2 : 3.6, repeat: props.exiting ? 0 : Infinity, ease: 'easeInOut' }}
      />

      <motion.img
        src={props.imageSrc}
        alt="Heart hourglass"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          filter: 'drop-shadow(0 16px 30px rgba(120,60,70,0.4))'
        }}
        animate={{
          opacity: props.exiting ? [1, 0.9, 0] : 1,
          scale: props.exiting ? [1, 1.02, 0.98] : 1
        }}
        transition={{ duration: props.exiting ? 2.6 : 2.2, ease: romanticEase }}
      />

      <motion.div
        style={{
          position: 'absolute',
          left: '50%',
          top: '8%',
          width: '58%',
          height: '84%',
          transform: 'translateX(-50%)',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 40%, rgba(255,220,190,0.2) 70%, rgba(255,255,255,0))',
          opacity: 0.5,
          mixBlendMode: 'screen',
          pointerEvents: 'none'
        }}
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        style={{
          position: 'absolute',
          top: '20%',
          width: 6,
          height: '50%',
          borderRadius: 999,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0), rgba(255,240,210,0.8), rgba(255,255,255,0))',
          filter: 'blur(0.4px)'
        }}
        animate={{ opacity: [0.2, 0.6, 0.2], y: [0, 12, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

function FloatingParticles(props: { intensity: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, idx) => ({
        id: idx,
        x: `${(idx * 41) % 100}%`,
        y: `${(idx * 67) % 100}%`,
        size: 1 + ((idx * 11) % 3),
        duration: 14 + (idx % 6) * 2,
        delay: (idx % 8) * 0.2
      })),
    []
  );

  return (
    <>
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          style={{
            position: 'absolute',
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            borderRadius: '50%',
            background: 'rgba(255,238,214,0.7)',
            pointerEvents: 'none',
            opacity: 0.3 + props.intensity * 0.2
          }}
          animate={{ y: [0, -18, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: particle.duration, repeat: Infinity, delay: particle.delay, ease: 'easeInOut' }}
        />
      ))}
    </>
  );
}

function RotatingMessage(props: { message: string; exiting: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {!props.exiting && (
        <motion.div
          key={props.message}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.85, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 1.5, ease: romanticEase }}
          style={{
            fontFamily: 'Garamond, Baskerville, Times New Roman, serif',
            fontSize: 'clamp(1rem, 3.2vw, 1.35rem)',
            letterSpacing: '0.02em',
            color: 'rgba(255,246,232,0.88)',
            textShadow: '0 0 18px rgba(255,219,182,0.35)'
          }}
        >
          {props.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default RoomTransitionLoader;
