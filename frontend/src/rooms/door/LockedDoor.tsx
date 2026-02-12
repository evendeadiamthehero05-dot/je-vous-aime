import { AnimatePresence, motion } from 'framer-motion';
import { forwardRef, type FormEvent, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { useDoorSocket } from './hooks/useDoorSocket';

type LockedDoorProps = {
  serverUrl: string;
  houseSessionId: string;
  participantId: string;
  onTransitionToFoyer?: () => void;
};

const romanticEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

export default function LockedDoor(props: LockedDoorProps) {
  const { connected, doorState, awaitingResponse, failedAttemptTick, unlockedBy, submitAttempt } = useDoorSocket({
    serverUrl: props.serverUrl,
    houseSessionId: props.houseSessionId,
    participantId: props.participantId
  });
  const [inputValue, setInputValue] = useState('');
  const [showFoyerFade, setShowFoyerFade] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmittedRef = useRef<string>('');

  const isLocked = doorState === 'LOCKED';
  const isUnlocked = doorState === 'UNLOCKED' || doorState === 'TRANSITIONED';
  const unlockedByPartner = Boolean(unlockedBy && unlockedBy !== props.participantId);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;

    const foyerFadeTimer = window.setTimeout(() => setShowFoyerFade(true), 2800);
    const doneTimer = window.setTimeout(() => props.onTransitionToFoyer?.(), 3600);
    return () => {
      window.clearTimeout(foyerFadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [isUnlocked, props]);

  useRomanticChime(isUnlocked);

  useEffect(() => {
    if (!isLocked || awaitingResponse) return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (trimmed === lastSubmittedRef.current) return;

    const timer = window.setTimeout(() => {
      if (!isLocked || awaitingResponse) return;
      if (trimmed === lastSubmittedRef.current) return;
      lastSubmittedRef.current = trimmed;
      submitAttempt(trimmed);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [inputValue, isLocked, awaitingResponse, submitAttempt]);

  return (
    <section style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <RomanticBackground failedAttemptTick={failedAttemptTick} unlocked={isUnlocked} />

      <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
          placeItems: 'center',
          padding: '2rem'
        }}
      >
        <div style={{ width: 'min(960px, 96vw)', display: 'grid', gap: '1.4rem', justifyItems: 'center' }}>
          <motion.div
            style={{
              padding: '0.35rem 0.78rem',
              borderRadius: 999,
              border: '1px solid rgba(255,230,240,0.45)',
              background: 'rgba(120,24,58,0.26)',
              color: 'rgba(255,244,249,0.92)',
              fontSize: '0.8rem',
              letterSpacing: '0.03em'
            }}
            animate={{ opacity: connected ? 1 : 0.65 }}
          >
            {connected ? 'Connected' : 'Reconnecting'}
          </motion.div>

          <DoorVisual failedAttemptTick={failedAttemptTick} unlocked={isUnlocked} />

          <motion.h1
            style={{
              margin: 0,
              fontFamily: '"Manrope", "Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
              color: '#fff6fa',
              letterSpacing: '0.06em',
              fontWeight: 600,
              textAlign: 'center',
              fontSize: 'clamp(1.8rem, 4.6vw, 2.9rem)'
            }}
            animate={{ opacity: isUnlocked ? 0.85 : 1 }}
            transition={{ duration: 1.2, ease: romanticEase }}
          >
            __________ is the key.
          </motion.h1>

          <KeyInput
            inputRef={inputRef}
            value={inputValue}
            onChange={setInputValue}
            disabled={!isLocked || awaitingResponse}
            failedAttemptTick={failedAttemptTick}
            unlockedByPartner={unlockedByPartner}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {showFoyerFade && (
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(110% 70% at 50% 15%, rgba(255,221,160,0.35), rgba(0,0,0,0) 45%), linear-gradient(180deg, rgba(16,14,18,0) 20%, rgba(7,9,13,0.88) 100%)'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: romanticEase }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function RomanticBackground(props: { failedAttemptTick: number; unlocked: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 64 }, (_, i) => ({
        id: i,
        left: `${(i * 47) % 100}%`,
        top: `${(i * 71) % 100}%`,
        size: 1 + ((i * 11) % 4),
        delay: (i % 9) * 0.2,
        duration: 10 + (i % 7) * 1.8
      })),
    []
  );

  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(130% 90% at 50% 16%, rgba(255,255,255,0.34), rgba(255,255,255,0.06) 30%, rgba(0,0,0,0) 60%), linear-gradient(160deg, #8e102f 0%, #f05d95 52%, #fff2f6 100%)'
      }}
      animate={{ filter: props.unlocked ? 'saturate(1.08) brightness(1.1)' : 'saturate(1) brightness(1)' }}
      transition={{ duration: 2.6, ease: romanticEase }}
    >
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 100% at 50% 50%, rgba(255,244,249,0.18), rgba(63,8,31,0.28) 70%, rgba(43,6,21,0.5) 100%)'
        }}
      />
      {particles.map((p) => (
        <motion.span
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'rgba(255,236,198,0.82)',
            boxShadow: '0 0 10px rgba(255,210,232,0.62)',
            pointerEvents: 'none'
          }}
          animate={{
            y: [0, -16, 0],
            opacity: props.failedAttemptTick > 0 && p.id % 5 === 0 ? [0.22, 0, 0.22] : [0.22, 0.52, 0.22]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut'
          }}
        />
      ))}
      <AnimatePresence>
        {props.unlocked &&
          Array.from({ length: 16 }, (_, i) => (
            <motion.span
              key={`heart-${i}`}
              style={{
                position: 'absolute',
                left: `${42 + (i % 5) * 4}%`,
                bottom: `${8 + (i % 3) * 3}%`,
                color: 'rgba(255,214,224,0.8)',
                fontSize: `${12 + (i % 4) * 3}px`,
                pointerEvents: 'none'
              }}
              initial={{ opacity: 0, y: 0, scale: 0.9 }}
              animate={{ opacity: [0, 0.9, 0], y: -130 - i * 6, scale: [0.9, 1.1, 0.95] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.8, delay: i * 0.08, ease: romanticEase }}
            >
              ♥
            </motion.span>
          ))}
      </AnimatePresence>
    </motion.div>
  );
}

function DoorVisual(props: { failedAttemptTick: number; unlocked: boolean }) {
  const wobble = props.failedAttemptTick > 0 ? [0, -1.8, 1.4, -1, 0.6, 0] : [0];

  return (
    <motion.div
      animate={{ x: wobble }}
      transition={{ duration: 0.55, ease: romanticEase }}
      style={{ perspective: 1200, width: 340, height: 500, display: 'grid', placeItems: 'center' }}
    >
      <motion.div
        animate={{
          rotateY: props.unlocked ? -63 : 0,
          y: props.unlocked ? -1 : 0,
          scale: 1,
          boxShadow: props.unlocked
            ? '0 0 70px rgba(255,225,162,0.5), inset 0 0 20px rgba(255,220,162,0.48)'
            : '0 0 40px rgba(255,190,118,0.34), inset 0 0 16px rgba(255,226,180,0.22)'
        }}
        transition={{ duration: props.unlocked ? 3.4 : 0.9, ease: romanticEase }}
        style={{
          width: 300,
          height: 430,
          borderRadius: 22,
          transformOrigin: 'left center',
          border: '1px solid rgba(253,221,167,0.5)',
          background:
            'linear-gradient(180deg, rgba(177,40,79,0.9) 0%, rgba(143,30,63,0.95) 36%, rgba(104,18,44,0.98) 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(140% 80% at 50% -16%, rgba(255,255,255,0.35), rgba(255,255,255,0) 45%), linear-gradient(110deg, rgba(255,244,248,0.18), rgba(255,244,248,0) 35%)',
            mixBlendMode: 'screen',
            pointerEvents: 'none'
          }}
          animate={{ opacity: props.unlocked ? 0.5 : 0.46 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(135deg, rgba(61,9,28,0.08) 0 8px, rgba(43,7,21,0.14) 8px 16px)',
            mixBlendMode: 'multiply',
            opacity: 0.3,
            pointerEvents: 'none'
          }}
          animate={{ opacity: props.unlocked ? 0.2 : 0.3 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        <motion.div
          style={{
            position: 'absolute',
            top: -20,
            left: -80,
            width: 140,
            height: 520,
            transform: 'rotate(12deg)',
            background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,245,250,0.34), rgba(255,255,255,0))',
            filter: 'blur(3px)',
            pointerEvents: 'none'
          }}
          animate={{ x: 0, opacity: props.unlocked ? 0.25 : 0.45 }}
          transition={{
            duration: 0.6,
            ease: 'easeInOut',
            repeat: 0
          }}
        />

        <motion.div
          style={{
            position: 'absolute',
            inset: 12,
            borderRadius: 16,
            border: '1px solid rgba(255,231,239,0.45)',
            boxShadow: 'inset 0 0 24px rgba(255,230,241,0.24)'
          }}
          animate={{ opacity: props.unlocked ? [0.4, 1, 0.4] : [0.3, 0.6, 0.3] }}
          transition={{ duration: props.unlocked ? 1.1 : 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.span
          style={{
            position: 'absolute',
            right: 38,
            top: 214,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #fff7fb, #f3b6ce)',
            boxShadow: '0 0 18px rgba(255,222,236,0.72)'
          }}
          animate={{
            scale: props.unlocked ? [1, 1.22, 1] : [1, 1.06, 1],
            filter: props.unlocked ? 'brightness(1.35)' : 'brightness(1)'
          }}
          transition={{ duration: props.unlocked ? 0.7 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <motion.div
        animate={{ opacity: props.unlocked ? 1 : 0 }}
        transition={{ duration: 2.3, ease: romanticEase }}
        style={{
          position: 'absolute',
          inset: '8% 10%',
          background:
            'radial-gradient(50% 100% at 35% 50%, rgba(255,255,255,0.78), rgba(255,211,228,0.52) 52%, rgba(255,217,136,0) 85%)',
          filter: 'blur(2px)',
          pointerEvents: 'none'
        }}
      />
    </motion.div>
  );
}

type KeyInputProps = {
  inputRef: RefObject<HTMLInputElement>;
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
  failedAttemptTick: number;
  unlockedByPartner: boolean;
};

const KeyInput = forwardRef<HTMLInputElement, KeyInputProps>(function KeyInput(props, _) {
  const { inputRef, value, onChange, disabled, failedAttemptTick, unlockedByPartner } = props;
  const failureGlow = failedAttemptTick > 0;

  return (
    <div style={{ width: 'min(520px, 86vw)', display: 'grid', gap: '0.9rem' }}>
      <motion.div
        animate={{
          boxShadow: failureGlow
            ? '0 0 0 2px rgba(255,146,167,0.6), 0 0 24px rgba(255,141,175,0.36)'
            : '0 0 0 1px rgba(255,230,240,0.55), 0 10px 26px rgba(79,10,33,0.14), inset 0 1px 0 rgba(255,255,255,0.38)'
        }}
        transition={{ duration: 0.5, ease: romanticEase }}
        style={{
          borderRadius: 9999,
          padding: 9,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))',
          backdropFilter: 'blur(16px) saturate(130%)',
          WebkitBackdropFilter: 'blur(16px) saturate(130%)'
        }}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          disabled={disabled}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder=""
          style={{
            width: '100%',
            border: '1px solid rgba(255,255,255,0.55)',
            borderRadius: 9999,
            padding: '0.92rem 1.15rem',
            background: 'rgba(120,24,58,0.2)',
            color: '#fff8fb',
            outlineColor: 'rgba(255,228,239,0.88)',
            outlineOffset: '2px',
            fontSize: '1.02rem',
            fontWeight: 500,
            letterSpacing: '0.01em',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)'
          }}
        />
      </motion.div>

      <AnimatePresence>
        {unlockedByPartner && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.8, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: romanticEase }}
            style={{ textAlign: 'center', color: 'rgba(255,228,191,0.8)', fontSize: '0.93rem' }}
          >
            Your partner found the key.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

function useRomanticChime(unlocked: boolean) {
  useEffect(() => {
    if (!unlocked) return;

    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);

    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.22);
      osc.stop(ctx.currentTime + 0.66 + i * 0.22);
    });

    gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.25);
    gain.gain.linearRampToValueAtTime(0.012, ctx.currentTime + 2.2);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3.5);

    return () => {
      window.setTimeout(() => {
        ctx.close().catch(() => undefined);
      }, 3600);
    };
  }, [unlocked]);
}
