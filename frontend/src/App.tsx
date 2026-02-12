import { useEffect, useMemo, useState } from 'react';
import { LockedDoor } from './rooms/door';
import { Foyer } from './rooms/foyer';

function readEnv(name: string, fallback = ''): string {
  return ((import.meta.env[name] as string | undefined) ?? fallback).trim();
}

type Slot = 'playerA' | 'playerB';

type BootstrapRecord = {
  houseSessionId: string;
  inviteCode: string;
  playerAId: string;
  playerBId: string;
  createdAt: string;
};

const BOOTSTRAP_KEY = 'jva.foyer.bootstrap.v1';

export default function App() {
  const serverUrl = readEnv('VITE_SERVER_URL', 'http://localhost:4000');
  const envHouseId = readEnv('VITE_HOUSE_SESSION_ID');
  const envParticipantId = readEnv('VITE_PARTICIPANT_ID');
  const envSelfSlot = readEnv('VITE_SELF_SLOT', 'playerA');
  const envPartnerId = readEnv('VITE_PARTNER_PARTICIPANT_ID');

  const [bootstrap, setBootstrap] = useState<BootstrapRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [roomView, setRoomView] = useState<'door' | 'foyer'>('door');

  const slotFromQuery = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get('slot');
    return value === 'playerB' ? 'playerB' : value === 'playerA' ? 'playerA' : null;
  }, []);

  useEffect(() => {
    const envComplete = Boolean(envHouseId && envParticipantId && envPartnerId && (envSelfSlot === 'playerA' || envSelfSlot === 'playerB'));
    if (envComplete) return;

    let canceled = false;
    setLoading(true);

    (async () => {
      try {
        const fromStorage = readBootstrapFromStorage();
        if (fromStorage) {
          const isLocked = await isDoorLocked(serverUrl, fromStorage.houseSessionId);
          if (isLocked) {
            if (!canceled) setBootstrap(fromStorage);
            return;
          }
          localStorage.removeItem(BOOTSTRAP_KEY);
        }

        const record = await bootstrapFromBackend(serverUrl);
        if (!canceled) setBootstrap(record);
      } catch (cause) {
        if (canceled) return;
        setError((cause as Error).message || 'Failed to bootstrap from backend.');
      } finally {
        if (canceled) return;
        setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [serverUrl, envHouseId, envParticipantId, envPartnerId, envSelfSlot]);

  const usingEnv = Boolean(envHouseId && envParticipantId && envPartnerId && (envSelfSlot === 'playerA' || envSelfSlot === 'playerB'));
  const selfSlot: Slot = ((slotFromQuery ?? (usingEnv ? envSelfSlot : 'playerA')) === 'playerB' ? 'playerB' : 'playerA');

  const session = useMemo(() => {
    if (usingEnv) {
      return {
        houseSessionId: envHouseId,
        participantId: envParticipantId,
        partnerParticipantId: envPartnerId,
        selfSlot
      };
    }

    if (!bootstrap) return null;

    return selfSlot === 'playerA'
      ? {
          houseSessionId: bootstrap.houseSessionId,
          participantId: bootstrap.playerAId,
          partnerParticipantId: bootstrap.playerBId,
          selfSlot
        }
      : {
          houseSessionId: bootstrap.houseSessionId,
          participantId: bootstrap.playerBId,
          partnerParticipantId: bootstrap.playerAId,
          selfSlot
        };
  }, [usingEnv, envHouseId, envParticipantId, envPartnerId, selfSlot, bootstrap]);

  if (!session) {
    return (
      <main
        style={{
          minHeight: '100vh',
          padding: '2rem',
          display: 'grid',
          placeItems: 'center',
          background: '#0b0f16',
          color: '#e8eef9',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial'
        }}
      >
        <section style={{ width: 'min(760px, 94vw)', lineHeight: 1.5 }}>
          <h1 style={{ marginTop: 0 }}>Preparing session</h1>
          <p>Current server URL: <code>{serverUrl}</code></p>
          <p>Slot selection: <code>{slotFromQuery ?? 'playerA'}</code> (use <code>?slot=playerB</code> in another tab).</p>
          {loading && <p>Auto-creating house and participant keys from backend...</p>}
          {error && <p style={{ color: '#ffb3bd' }}>Bootstrap error: {error}</p>}
          <p>If backend is offline, start it in <code>backend/</code> with <code>npm run dev</code>.</p>
        </section>
      </main>
    );
  }

  if (slotFromQuery === null && !usingEnv) {
    const baseUrl = window.location.origin;
    return (
      <main
        style={{
          minHeight: '100vh',
          padding: '2rem 1.2rem',
          display: 'grid',
          placeItems: 'center',
          background:
            'radial-gradient(120% 100% at 50% 18%, rgba(255,255,255,0.35), rgba(0,0,0,0) 45%), linear-gradient(160deg, #7f1028 0%, #e95186 52%, #fff4f7 100%)',
          color: '#fff7fa',
          fontFamily: '"Manrope", "Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif'
        }}
      >
        <section
          style={{
            width: 'min(980px, 96vw)',
            lineHeight: 1.5,
            border: '1px solid rgba(255,230,195,0.3)',
            borderRadius: 26,
            background: 'rgba(90, 14, 36, 0.35)',
            boxShadow: '0 30px 80px rgba(73, 9, 29, 0.35), inset 0 0 40px rgba(255, 218, 231, 0.18)',
            padding: '2rem 1.2rem'
          }}
        >
          <h1
            style={{
              marginTop: 0,
              textAlign: 'center',
              fontFamily: '"Manrope", "Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
              fontSize: 'clamp(2rem, 5vw, 3.1rem)',
              letterSpacing: '0.03em'
            }}
          >
            Enter The House
          </h1>
          <p style={{ textAlign: 'center', color: 'rgba(255,233,202,0.9)' }}>
            Session is ready. Choose your side and step into the door ritual.
          </p>

          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              marginTop: '1.5rem'
            }}
          >
            <a
              href={`${baseUrl}/?slot=playerA`}
              style={{
                textDecoration: 'none',
                borderRadius: 24,
                border: '1px solid rgba(255, 255, 255, 0.42)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.12))',
                color: '#fff6fa',
                padding: '1.1rem',
                display: 'grid',
                placeItems: 'center',
                minHeight: 180,
                backdropFilter: 'blur(14px) saturate(130%)',
                WebkitBackdropFilter: 'blur(14px) saturate(130%)',
                boxShadow: '0 14px 34px rgba(73, 9, 29, 0.2), inset 0 1px 0 rgba(255,255,255,0.45)'
              }}
            >
              <div style={{ fontSize: '4.2rem', lineHeight: 1 }}>{'\u2642'}</div>
            </a>

            <a
              href={`${baseUrl}/?slot=playerB`}
              style={{
                textDecoration: 'none',
                borderRadius: 24,
                border: '1px solid rgba(255, 255, 255, 0.42)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.12))',
                color: '#fff6fa',
                padding: '1.1rem',
                display: 'grid',
                placeItems: 'center',
                minHeight: 180,
                backdropFilter: 'blur(14px) saturate(130%)',
                WebkitBackdropFilter: 'blur(14px) saturate(130%)',
                boxShadow: '0 14px 34px rgba(73, 9, 29, 0.2), inset 0 1px 0 rgba(255,255,255,0.45)'
              }}
            >
              <div style={{ fontSize: '4.2rem', lineHeight: 1 }}>{'\u2640'}</div>
            </a>
          </div>

          <p style={{ marginTop: '1.2rem', textAlign: 'center', opacity: 0.82 }}>
            Current server URL: <code>{serverUrl}</code>
          </p>
        </section>
      </main>
    );
  }

  return (
    roomView === 'door' ? (
      <LockedDoor
        serverUrl={serverUrl}
        houseSessionId={session.houseSessionId}
        participantId={session.participantId}
        onTransitionToFoyer={() => setRoomView('foyer')}
      />
    ) : (
      <Foyer
        serverUrl={serverUrl}
        houseSessionId={session.houseSessionId}
        participantId={session.participantId}
        selfSlot={selfSlot}
        partnerParticipantId={session.partnerParticipantId}
      />
    )
  );
}

function readBootstrapFromStorage(): BootstrapRecord | null {
  try {
    const raw = localStorage.getItem(BOOTSTRAP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BootstrapRecord>;
    if (!parsed.houseSessionId || !parsed.playerAId || !parsed.playerBId || !parsed.inviteCode) return null;
    return {
      houseSessionId: parsed.houseSessionId,
      inviteCode: parsed.inviteCode,
      playerAId: parsed.playerAId,
      playerBId: parsed.playerBId,
      createdAt: parsed.createdAt ?? new Date().toISOString()
    };
  } catch {
    return null;
  }
}

async function bootstrapFromBackend(serverUrl: string): Promise<BootstrapRecord> {
  const createResponse = await fetch(`${serverUrl}/api/houses/create`, {
    method: 'POST'
  });
  if (!createResponse.ok) {
    const details = await safeErrorMessage(createResponse);
    throw new Error(`Create failed (${createResponse.status}): ${details}`);
  }

  const created = (await createResponse.json()) as {
    houseSessionId: string;
    inviteCode: string;
    participantId: string;
  };

  const joinResponse = await fetch(`${serverUrl}/api/houses/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode: created.inviteCode })
  });
  if (!joinResponse.ok) {
    const details = await safeErrorMessage(joinResponse);
    throw new Error(`Join failed (${joinResponse.status}): ${details}`);
  }

  const joined = (await joinResponse.json()) as {
    participantId: string;
  };

  const record: BootstrapRecord = {
    houseSessionId: created.houseSessionId,
    inviteCode: created.inviteCode,
    playerAId: created.participantId,
    playerBId: joined.participantId,
    createdAt: new Date().toISOString()
  };

  localStorage.setItem(BOOTSTRAP_KEY, JSON.stringify(record));
  return record;
}

async function safeErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string; hint?: string };
    if (payload.message && payload.hint) return `${payload.message}. ${payload.hint}`;
    if (payload.message) return payload.message;
  } catch {
    // Ignore JSON parse failures and fallback to generic status text.
  }
  return response.statusText || 'Unknown backend error';
}

async function isDoorLocked(serverUrl: string, houseSessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`${serverUrl}/api/door/${encodeURIComponent(houseSessionId)}/state`);
    if (!response.ok) return false;
    const payload = (await response.json()) as { state?: { state?: 'LOCKED' | 'UNLOCKED' | 'TRANSITIONED' } };
    return payload.state?.state === 'LOCKED';
  } catch {
    return false;
  }
}
