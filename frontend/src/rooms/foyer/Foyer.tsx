import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { useHoldActions, useRoomState, useTypingSync } from './hooks/useFoyerSocket';
import type { FoyerPhase } from './types/foyer';

type FoyerProps = {
  serverUrl: string;
  houseSessionId: string;
  participantId: string;
  selfSlot: 'playerA' | 'playerB';
  partnerParticipantId: string;
};

const romanticEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

export function Foyer(props: FoyerProps) {
  const { roomState, connected, lastEvent, emitIntent } = useRoomState(props);
  const { onHoldStart, onHoldEnd } = useHoldActions(emitIntent);
  const typing = useTypingSync(emitIntent);

  const phase: FoyerPhase = roomState?.phase ?? 'DARK';
  const bothHolding = Boolean(roomState?.hold.playerA.pressed && roomState?.hold.playerB.pressed);

  useAmbientSound(phase, bothHolding);

  const roomWarmth = useMemo(() => {
    if (phase === 'DARK') return 0;
    if (phase === 'LIGHT_IN_PROGRESS') return 0.55;
    return 1;
  }, [phase]);

  return (
    <motion.section
      aria-label="Foyer Intention Room"
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        background: phase === 'DARK' ? '#08090d' : '#0c0b0a',
        color: '#f6e7c5',
        display: 'grid',
        placeItems: 'center'
      }}
      animate={{
        filter: `saturate(${0.78 + roomWarmth * 0.27}) brightness(${0.82 + roomWarmth * 0.25})`
      }}
      transition={{ duration: 2.2, ease: romanticEase }}
    >
      <FoyerAtmosphere phase={phase} bothHolding={bothHolding} />

      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(120% 75% at 50% 95%, rgba(228,152,57,0.24), rgba(0,0,0,0) 60%), radial-gradient(115% 90% at 50% 50%, rgba(237,188,109,0.14), rgba(0,0,0,0) 62%)',
          opacity: phase === 'DARK' ? 0 : 1
        }}
        initial={false}
        animate={{ opacity: phase === 'DARK' ? 0 : 1 }}
        transition={{ duration: 2.3, ease: romanticEase }}
      />

      <motion.div
        style={{
          width: 'min(720px, 92vw)',
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          padding: '2rem 1rem'
        }}
      >
        <ConnectionPill connected={connected} phase={phase} />

        <AnimatePresence mode="wait">
          {(phase === 'DARK' || phase === 'LIGHT_IN_PROGRESS') && (
            <motion.div
              key="switch"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.9, ease: romanticEase }}
            >
              <LightSwitch
                phase={phase}
                bothHolding={bothHolding}
                onHoldStart={onHoldStart}
                onHoldEnd={onHoldEnd}
                lastEventLabel={lastEvent?.event ?? null}
              />
            </motion.div>
          )}

          {(phase === 'LIT' || phase === 'NOTE_ENTRY') && roomState && (
            <motion.div
              key="note-entry"
              initial={{ opacity: 0, y: 24, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 1.1, ease: romanticEase }}
            >
              <CrisisNoteInput
                prompt={roomState.note.prompt}
                value={typing.draft}
                maxChars={typing.maxChars}
                partnerThinking={typing.partnerThinking}
                waitingForPartnerConfirm={typing.waitingForPartnerConfirm}
                onChange={typing.updateDraft}
                onConfirm={typing.confirmDraft}
              />
            </motion.div>
          )}

          {phase === 'NOTE_LOCKED' && roomState && (
            <motion.div
              key="note-locked"
              initial={{ opacity: 0, y: 24, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: romanticEase }}
            >
              <LockedNoteDisplay
                sentence={roomState.outcome.crisisSentence ?? ''}
                submittedAt={roomState.outcome.crisisSentenceSubmittedAt}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.section>
  );
}

type LightSwitchProps = {
  phase: FoyerPhase;
  bothHolding: boolean;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  lastEventLabel: string | null;
};

function LightSwitch(props: LightSwitchProps) {
  return (
    <div style={{ display: 'grid', gap: '1rem', justifyItems: 'center' }}>
      <motion.div
        style={{
          fontFamily: 'Garamond, Baskerville, Times New Roman, serif',
          letterSpacing: '0.04em',
          color: 'rgba(250,233,192,0.9)',
          fontSize: '1.12rem'
        }}
        animate={{ opacity: props.phase === 'LIGHT_IN_PROGRESS' ? 1 : 0.84 }}
      >
        Hold together. Stay.
      </motion.div>

      <motion.button
        type="button"
        onMouseDown={props.onHoldStart}
        onMouseUp={props.onHoldEnd}
        onMouseLeave={props.onHoldEnd}
        onTouchStart={props.onHoldStart}
        onTouchEnd={props.onHoldEnd}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.3, ease: romanticEase }}
        style={{
          position: 'relative',
          width: 120,
          height: 220,
          borderRadius: 32,
          border: '1px solid rgba(253, 224, 164, 0.45)',
          background:
            'linear-gradient(160deg, rgba(84,71,58,0.72), rgba(35,28,24,0.95) 58%, rgba(16,13,12,0.98))',
          boxShadow: props.bothHolding
            ? '0 0 48px rgba(234,178,79,0.5), inset 0 0 16px rgba(255,219,145,0.35)'
            : '0 12px 34px rgba(0,0,0,0.56), inset 0 0 8px rgba(255,236,191,0.08)',
          cursor: 'pointer'
        }}
      >
        <motion.div
          style={{
            position: 'absolute',
            left: '50%',
            top: props.phase === 'LIGHT_IN_PROGRESS' ? 24 : 54,
            transform: 'translateX(-50%)',
            width: 42,
            height: 86,
            borderRadius: 20,
            border: '1px solid rgba(255,237,196,0.38)',
            background:
              'linear-gradient(180deg, rgba(240,203,135,0.5), rgba(181,136,73,0.9) 65%, rgba(106,78,44,0.95))',
            boxShadow: props.bothHolding
              ? '0 0 26px rgba(255,202,95,0.55), inset 0 -4px 12px rgba(43,29,12,0.38)'
              : 'inset 0 -4px 12px rgba(43,29,12,0.5)'
          }}
          animate={{
            top: props.phase === 'LIGHT_IN_PROGRESS' ? 24 : 54,
            boxShadow: props.bothHolding
              ? '0 0 26px rgba(255,202,95,0.55), inset 0 -4px 12px rgba(43,29,12,0.38)'
              : 'inset 0 -4px 12px rgba(43,29,12,0.5)'
          }}
          transition={{ duration: 0.55, ease: romanticEase }}
        />
      </motion.button>

      <motion.div
        style={{
          minHeight: 28,
          color: 'rgba(249,231,186,0.78)',
          fontSize: '0.94rem',
          letterSpacing: '0.02em'
        }}
        animate={{ opacity: 1 }}
      >
        {props.phase === 'LIGHT_IN_PROGRESS'
          ? 'Both hands are here. Keep holding.'
          : props.lastEventLabel === 'hold_interrupted'
          ? 'The room dimmed. Begin again together.'
          : 'Press and hold. Release resets the ritual.'}
      </motion.div>
    </div>
  );
}

type CrisisNoteInputProps = {
  prompt: string;
  value: string;
  maxChars: number;
  partnerThinking: boolean;
  waitingForPartnerConfirm: boolean;
  onChange: (nextValue: string) => void;
  onConfirm: () => void;
};

function CrisisNoteInput(props: CrisisNoteInputProps) {
  const remaining = Math.max(0, props.maxChars - props.value.length);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <motion.h2
        style={{
          margin: 0,
          fontFamily: 'Garamond, Baskerville, Times New Roman, serif',
          fontSize: 'clamp(1.5rem, 4.4vw, 2.2rem)',
          fontWeight: 500,
          color: '#f7e7c1',
          textWrap: 'balance'
        }}
      >
        {props.prompt}
      </motion.h2>

      <motion.div
        style={{
          position: 'relative',
          borderRadius: 18,
          border: '1px solid rgba(245,206,136,0.38)',
          background: 'rgba(13,10,8,0.48)',
          padding: '0.8rem 1rem',
          boxShadow: 'inset 0 0 14px rgba(255,223,157,0.11)'
        }}
      >
        <input
          value={props.value}
          onChange={(event) => onSingleLineChange(event.currentTarget.value, props.onChange)}
          maxLength={props.maxChars}
          aria-label="Shared crisis sentence"
          style={{
            width: '100%',
            outline: 'none',
            border: 'none',
            background: 'transparent',
            color: '#f7e7c1',
            fontFamily: 'Garamond, Baskerville, Times New Roman, serif',
            fontSize: '1.28rem',
            letterSpacing: '0.02em'
          }}
        />

        <motion.span
          style={{
            position: 'absolute',
            right: 14,
            top: 12,
            width: 2,
            height: 22,
            borderRadius: 2,
            background: 'rgba(253,220,152,0.86)'
          }}
          animate={{ opacity: [0.15, 1, 0.15] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          alignItems: 'center',
          color: 'rgba(247,224,178,0.74)',
          fontSize: '0.95rem'
        }}
      >
        <span>{props.partnerThinking ? "They're thinking..." : 'Take your time. Keep it gentle.'}</span>
        <span>{remaining} left</span>
      </div>

      <div style={{ display: 'grid', placeItems: 'center' }}>
        <motion.button
          type="button"
          onClick={props.onConfirm}
          whileTap={{ scale: 0.98 }}
          animate={props.waitingForPartnerConfirm ? { boxShadow: '0 0 0 0 rgba(255,142,154,0.55)' } : {}}
          transition={{ duration: 0.25, ease: romanticEase }}
          style={{
            minWidth: 230,
            border: '1px solid rgba(255,209,150,0.48)',
            borderRadius: 999,
            background:
              'linear-gradient(145deg, rgba(212,143,58,0.4), rgba(95,58,24,0.52)), radial-gradient(circle at 30% 25%, rgba(255,220,160,0.25), transparent 55%)',
            color: '#fdf0cf',
            fontFamily: 'Garamond, Baskerville, Times New Roman, serif',
            fontSize: '1.05rem',
            padding: '0.72rem 1.4rem',
            cursor: 'pointer'
          }}
        >
          {props.waitingForPartnerConfirm ? 'Waiting for their yes...' : 'Confirm sentence'}
        </motion.button>

        <AnimatePresence>
          {props.waitingForPartnerConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: [1, 1.08, 1] }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 1.15, repeat: Infinity, ease: romanticEase }}
              style={{ marginTop: 12, color: '#ffccd5', fontSize: '1.1rem' }}
            >
              ♡
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

type LockedNoteDisplayProps = {
  sentence: string;
  submittedAt: string | null;
};

function LockedNoteDisplay(props: LockedNoteDisplayProps) {
  return (
    <div style={{ display: 'grid', gap: '0.85rem', justifyItems: 'center' }}>
      <motion.div
        style={{
          fontFamily: 'Garamond, Baskerville, Times New Roman, serif',
          letterSpacing: '0.05em',
          color: 'rgba(247,233,204,0.78)',
          fontSize: '0.95rem',
          textTransform: 'uppercase'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.1, ease: romanticEase }}
      >
        Spoken and kept
      </motion.div>

      <motion.blockquote
        style={{
          margin: 0,
          maxWidth: 620,
          fontFamily: 'Garamond, Baskerville, Times New Roman, serif',
          fontSize: 'clamp(1.45rem, 4vw, 2.2rem)',
          color: '#ffefcc',
          lineHeight: 1.4,
          textShadow: '0 0 24px rgba(255,206,117,0.3)'
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, ease: romanticEase }}
      >
        “{props.sentence}”
      </motion.blockquote>

      <motion.div
        style={{
          width: 'min(480px, 78vw)',
          height: 2,
          borderRadius: 999,
          background: 'linear-gradient(90deg, rgba(0,0,0,0), rgba(255,213,142,0.88), rgba(0,0,0,0))'
        }}
        animate={{ opacity: [0.35, 1, 0.35], scaleX: [0.85, 1, 0.85] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: romanticEase }}
      />

      <div style={{ color: 'rgba(246,224,184,0.64)', fontSize: '0.86rem' }}>
        {props.submittedAt ? `Locked ${new Date(props.submittedAt).toLocaleString()}` : 'Locked'}
      </div>
    </div>
  );
}

function FoyerAtmosphere(props: { phase: FoyerPhase; bothHolding: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }, (_, idx) => ({
        id: idx,
        x: `${(idx * 91) % 100}%`,
        y: `${(idx * 53) % 100}%`,
        size: 1 + ((idx * 7) % 3),
        duration: 12 + (idx % 7) * 2
      })),
    []
  );

  return (
    <>
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(90% 85% at 50% 52%, rgba(247,178,69,0.3), rgba(247,178,69,0.08) 33%, rgba(0,0,0,0) 74%)'
        }}
        initial={false}
        animate={{
          opacity: props.phase === 'DARK' ? 0 : props.phase === 'LIGHT_IN_PROGRESS' ? 0.45 : 0.95,
          scale: props.phase === 'DARK' ? 0.95 : 1
        }}
        transition={{ duration: props.phase === 'LIT' ? 2.2 : 1.6, ease: romanticEase }}
      />

      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(100% 100% at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.53) 86%, rgba(0,0,0,0.8) 100%)'
        }}
        animate={{ opacity: props.phase === 'DARK' ? 0.7 : 0.4 }}
        transition={{ duration: 2.1, ease: romanticEase }}
      />

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
            background: 'rgba(255,231,180,0.8)',
            pointerEvents: 'none',
            filter: 'blur(0.2px)'
          }}
          animate={{
            y: [0, -18, 0],
            opacity: props.phase === 'DARK' ? [0.08, 0.16, 0.08] : [0.16, 0.42, 0.16]
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: particle.id * 0.08
          }}
        />
      ))}

      <AnimatePresence>
        {props.bothHolding && (
          <motion.div
            key="heartbeat"
            style={{
              position: 'absolute',
              width: 260,
              height: 260,
              borderRadius: '50%',
              border: '1px solid rgba(255,204,129,0.3)',
              pointerEvents: 'none'
            }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: [0.24, 0.58, 0.24], scale: [0.88, 1.12, 0.88] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.65, repeat: Infinity, ease: romanticEase }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ConnectionPill(props: { connected: boolean; phase: FoyerPhase }) {
  return (
    <motion.div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: '1.2rem',
        padding: '0.36rem 0.68rem',
        borderRadius: 999,
        border: '1px solid rgba(249,216,157,0.28)',
        background: 'rgba(22,16,13,0.38)',
        color: 'rgba(248,226,181,0.82)',
        fontSize: '0.8rem',
        letterSpacing: '0.03em'
      }}
      animate={{ opacity: props.phase === 'DARK' ? 0.78 : 1 }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: props.connected ? '#9de0b5' : '#ff9ba8',
          boxShadow: props.connected ? '0 0 10px rgba(157,224,181,0.7)' : '0 0 10px rgba(255,155,168,0.65)'
        }}
      />
      {props.connected ? 'Synchronized' : 'Reconnecting'}
    </motion.div>
  );
}

function onSingleLineChange(raw: string, onChange: (nextValue: string) => void) {
  // UI strips line breaks for comfort, backend still remains the source of truth.
  onChange(raw.replace(/[\r\n]/g, ' '));
}

function useAmbientSound(phase: FoyerPhase, bothHolding: boolean) {
  useEffect(() => {
    const AudioCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const ctx = new AudioCtor();
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = phase === 'DARK' ? 110 : 174;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    // Soft sustained tone reinforces emotional pacing without forcing attention.
    const targetGain = phase === 'DARK' ? 0 : bothHolding ? 0.022 : 0.012;
    gain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 0.35);

    return () => {
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.24);
      window.setTimeout(() => {
        osc.stop();
        ctx.close().catch(() => undefined);
      }, 280);
    };
  }, [phase, bothHolding]);
}

export default Foyer;
