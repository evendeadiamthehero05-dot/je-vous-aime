import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { usePresenceSocket } from './hooks/usePresenceSocket';
import { usePresenceStore } from './store/presenceStore';

type LivingRoomProps = {
  serverUrl: string;
  houseSessionId: string;
  participantId: string;
  selfSlot: 'playerA' | 'playerB';
  partnerParticipantId: string;
};

const romanticEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

export function LivingRoom(props: LivingRoomProps) {
  const { emitSit, emitInteraction } = usePresenceSocket(props);
  const { roomState, partnerConnected, lastProgress, lastCompleted } = usePresenceStore();

  const state = roomState?.state ?? 'NOT_SEATED';
  const stillnessActive = state === 'STILLNESS_IN_PROGRESS' || state === 'COMPLETED';
  const bothSeated = state === 'BOTH_SEATED' || stillnessActive;
  const completed = state === 'COMPLETED' || Boolean(lastCompleted);

  const [selfSeated, setSelfSeated] = useState(false);
  const [breakPulseTick, setBreakPulseTick] = useState(0);
  const [showCompletionText, setShowCompletionText] = useState(false);

  useEffect(() => {
    if (state === 'NOT_SEATED') {
      setSelfSeated(false);
    }
  }, [state]);

  useEffect(() => {
    if (lastProgress?.kind === 'stillness_interrupted') {
      // A barely noticeable cool shift marks the quiet breaking.
      setBreakPulseTick((n) => n + 1);
    }
  }, [lastProgress]);

  useEffect(() => {
    if (!completed) return;
    setShowCompletionText(true);
    const timer = window.setTimeout(() => setShowCompletionText(false), 4000);
    return () => window.clearTimeout(timer);
  }, [completed]);

  useAmbientPresenceSound({ stillnessActive, bothSeated, completed, partnerConnected });

  const warmth = useMemo(() => {
    if (!partnerConnected) return 0.55;
    if (completed) return 1;
    if (stillnessActive) return 0.86;
    if (bothSeated) return 0.76;
    if (state === 'PARTIALLY_SEATED') return 0.68;
    return 0.62;
  }, [partnerConnected, completed, stillnessActive, bothSeated, state]);

  const dustParticles = useMemo(
    () =>
      Array.from({ length: 48 }, (_, idx) => ({
        id: idx,
        x: `${(idx * 37) % 100}%`,
        y: `${(idx * 59) % 100}%`,
        size: 1 + ((idx * 9) % 3),
        duration: 14 + (idx % 7) * 2.2,
        delay: (idx % 6) * 0.25
      })),
    []
  );

  const partnerSeated = bothSeated || (state === 'PARTIALLY_SEATED' && !selfSeated);
  const closeness = completed ? 22 : stillnessActive ? 14 : bothSeated ? 8 : 0;

  return (
    <motion.section
      aria-label="Living Room Presence"
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(170deg, #24160f 0%, #1b120d 52%, #0f0b0a 100%)',
        color: '#f6e7c5'
      }}
      animate={{
        filter: `saturate(${0.7 + warmth * 0.25}) brightness(${0.7 + warmth * 0.22})`
      }}
      transition={{ duration: 2.4, ease: romanticEase }}
      onPointerDown={() => emitInteraction()}
    >
      <AmbientRoom warmth={warmth} breakPulseTick={breakPulseTick} completed={completed} />

      {dustParticles.map((particle) => (
        <motion.span
          key={particle.id}
          style={{
            position: 'absolute',
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            borderRadius: '50%',
            background: 'rgba(255,225,174,0.7)',
            filter: 'blur(0.4px)',
            pointerEvents: 'none'
          }}
          animate={{
            y: [0, -18, 0],
            opacity: [0.08, 0.36, 0.08]
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut'
          }}
        />
      ))}

      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          pointerEvents: 'none'
        }}
      >
        <div style={{ width: 'min(900px, 96vw)', position: 'relative', height: '70vh' }}>
          <Avatars
            selfSeated={selfSeated}
            partnerSeated={partnerSeated}
            partnerConnected={partnerConnected}
            closeness={closeness}
            stillnessActive={stillnessActive}
            completed={completed}
          />

          <Couch
            seated={selfSeated || partnerSeated}
            onSit={() => {
              setSelfSeated(true);
              emitSit();
            }}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {completed && <CompletionShimmer />}
      </AnimatePresence>

      <AnimatePresence>
        {showCompletionText && (
          <motion.div
            key="presence-text"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 2.2, ease: romanticEase }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              fontFamily: 'Garamond, Baskerville, Times New Roman, serif',
              fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
              color: 'rgba(255,241,214,0.95)',
              textShadow: '0 0 28px rgba(255,213,140,0.4)',
              pointerEvents: 'none'
            }}
          >
            Staying is a form of love.
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function AmbientRoom(props: { warmth: number; breakPulseTick: number; completed: boolean }) {
  return (
    <>
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 80% at 50% 85%, rgba(236,166,76,0.22), rgba(0,0,0,0) 62%), radial-gradient(100% 70% at 50% 10%, rgba(255,221,165,0.24), rgba(0,0,0,0) 55%)'
        }}
        animate={{ opacity: props.completed ? 0.9 : 0.7 + props.warmth * 0.2 }}
        transition={{ duration: 2.6, ease: romanticEase }}
      />

      <motion.div
        key={`break-${props.breakPulseTick}`}
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 80% at 50% 75%, rgba(146,178,203,0.12), rgba(0,0,0,0) 60%)',
          opacity: 0
        }}
        animate={{ opacity: [0, 0.14, 0] }}
        transition={{ duration: 1.8, ease: 'easeInOut' }}
      />

      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.65) 85%, rgba(0,0,0,0.9) 100%)'
        }}
        animate={{ opacity: props.completed ? 0.3 : 0.5 }}
        transition={{ duration: 2.4, ease: romanticEase }}
      />

      <motion.div
        style={{
          position: 'absolute',
          left: '10%',
          bottom: '18%',
          width: 180,
          height: 240,
          borderRadius: 100,
          background:
            'radial-gradient(60% 60% at 50% 50%, rgba(255,231,186,0.8), rgba(240,179,88,0.22) 55%, rgba(0,0,0,0) 75%)',
          filter: 'blur(2px)',
          opacity: 0.68
        }}
        animate={{ opacity: props.completed ? 0.9 : 0.68 }}
        transition={{ duration: 2.2, ease: romanticEase }}
      />

      <motion.div
        style={{
          position: 'absolute',
          right: '10%',
          bottom: '20%',
          width: 160,
          height: 220,
          borderRadius: 100,
          background:
            'radial-gradient(60% 60% at 50% 50%, rgba(255,231,186,0.75), rgba(240,179,88,0.2) 55%, rgba(0,0,0,0) 75%)',
          filter: 'blur(2px)',
          opacity: 0.58
        }}
        animate={{ opacity: props.completed ? 0.86 : 0.58 }}
        transition={{ duration: 2.2, ease: romanticEase }}
      />
    </>
  );
}

function Couch(props: { seated: boolean; onSit: () => void }) {
  return (
    <motion.div
      onPointerDown={(event) => {
        event.stopPropagation();
        props.onSit();
      }}
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '12%',
        transform: 'translateX(-50%)',
        width: 'min(520px, 86vw)',
        height: 180,
        borderRadius: 40,
        background:
          'linear-gradient(180deg, rgba(90,56,35,0.96), rgba(55,32,20,0.98) 65%, rgba(32,19,12,0.98))',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 6px 18px rgba(255,200,140,0.1)',
        pointerEvents: 'auto',
        cursor: 'pointer'
      }}
      animate={{
        scale: props.seated ? 0.992 : 1,
        boxShadow: props.seated
          ? '0 26px 60px rgba(0,0,0,0.55), inset 0 8px 18px rgba(255,210,150,0.16)'
          : '0 24px 60px rgba(0,0,0,0.5), inset 0 6px 18px rgba(255,200,140,0.1)'
      }}
      transition={{ duration: 1.6, ease: romanticEase }}
    >
      <motion.div
        style={{
          position: 'absolute',
          left: '8%',
          right: '8%',
          top: 18,
          height: 80,
          borderRadius: 26,
          background:
            'linear-gradient(180deg, rgba(120,74,46,0.95), rgba(80,48,30,0.98) 70%, rgba(60,34,22,0.98))',
          boxShadow: 'inset 0 6px 14px rgba(255,224,175,0.08)'
        }}
        animate={{ y: props.seated ? 4 : 0 }}
        transition={{ duration: 1.5, ease: romanticEase }}
      />
    </motion.div>
  );
}

function Avatars(props: {
  selfSeated: boolean;
  partnerSeated: boolean;
  partnerConnected: boolean;
  closeness: number;
  stillnessActive: boolean;
  completed: boolean;
}) {
  const drift = props.stillnessActive ? 2 : 0;

  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: '0 0 18% 0',
        display: 'grid',
        placeItems: 'center'
      }}
      animate={{
        y: props.stillnessActive ? [0, -6, 0] : 0
      }}
      transition={{ duration: 3.4, repeat: props.stillnessActive ? Infinity : 0, ease: 'easeInOut' }}
    >
      <div style={{ position: 'relative', width: 'min(520px, 86vw)', height: 260 }}>
        <AvatarSilhouette
          position="left"
          seated={props.selfSeated}
          connected
          offset={-props.closeness}
          drift={-drift}
          completed={props.completed}
        />
        <AvatarSilhouette
          position="right"
          seated={props.partnerSeated}
          connected={props.partnerConnected}
          offset={props.closeness}
          drift={drift}
          completed={props.completed}
        />
      </div>
    </motion.div>
  );
}

function AvatarSilhouette(props: {
  position: 'left' | 'right';
  seated: boolean;
  connected: boolean;
  offset: number;
  drift: number;
  completed: boolean;
}) {
  const baseX = props.position === 'left' ? -90 : 90;

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 0,
        width: 120,
        height: 200,
        borderRadius: 80,
        background:
          'radial-gradient(70% 60% at 50% 20%, rgba(255,226,189,0.35), rgba(104,74,55,0.75) 65%, rgba(56,36,26,0.85))',
        filter: 'blur(0.2px)'
      }}
      animate={{
        x: baseX + props.offset,
        y: props.seated ? 16 : 0,
        opacity: props.connected ? 0.9 : 0.35,
        scale: props.completed ? 1.02 : 1,
        filter: props.connected ? 'blur(0.2px)' : 'blur(1px)',
        translateX: props.drift
      }}
      transition={{ duration: 2.2, ease: romanticEase }}
    >
      <motion.div
        style={{
          position: 'absolute',
          left: '50%',
          top: -28,
          width: 64,
          height: 64,
          borderRadius: '50%',
          background:
            'radial-gradient(70% 70% at 45% 35%, rgba(255,232,204,0.4), rgba(86,58,42,0.75) 68%, rgba(56,38,28,0.88))',
          transform: 'translateX(-50%)'
        }}
        animate={{ y: props.seated ? 6 : 0 }}
        transition={{ duration: 2, ease: romanticEase }}
      />
    </motion.div>
  );
}

function CompletionShimmer() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.7, 0] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 3, ease: 'easeInOut' }}
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
          left: '-30%',
          width: '60%',
          background:
            'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,236,196,0.35), rgba(255,255,255,0))',
          filter: 'blur(6px)'
        }}
        animate={{ x: ['0%', '160%'] }}
        transition={{ duration: 2.6, ease: romanticEase }}
      />
    </motion.div>
  );
}

function useAmbientPresenceSound(args: {
  stillnessActive: boolean;
  bothSeated: boolean;
  completed: boolean;
  partnerConnected: boolean;
}) {
  useEffect(() => {
    const AudioCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const ctx = new AudioCtor();
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = args.completed ? 220 : args.stillnessActive ? 196 : args.bothSeated ? 174 : 160;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    const targetGain = args.partnerConnected ? (args.stillnessActive ? 0.02 : 0.012) : 0.006;
    gain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 0.6);

    // Soft ambient bed reinforces safety without drawing attention.
    return () => {
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      window.setTimeout(() => {
        osc.stop();
        ctx.close().catch(() => undefined);
      }, 500);
    };
  }, [args.stillnessActive, args.bothSeated, args.completed, args.partnerConnected]);
}

export default LivingRoom;
