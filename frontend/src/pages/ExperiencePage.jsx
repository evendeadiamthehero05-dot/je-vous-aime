import HeartbeatScene from '../components/scenes/HeartbeatScene';
import SimultaneousRevealScene from '../components/scenes/SimultaneousRevealScene';
import LetterScene from '../components/scenes/LetterScene';
import FarewellScene from '../components/scenes/FarewellScene';
import { bothUsersReady } from '../lib/roomService';

const sceneLabels = ['Heartbeat Sync', 'Simultaneous Reveal', 'Letter Scene', 'Farewell'];

export default function ExperiencePage({
  roomData,
  uid,
  participants,
  onHeartbeat,
  onReveal,
  onLetter,
  onReadyToggle,
  onAdvance
}) {
  const sceneIndex = roomData?.sceneIndex || 0;
  const amReady = Boolean(roomData?.sceneReady?.[uid]);
  const allReady = bothUsersReady(roomData);

  return (
    <main className="flex min-h-screen items-center justify-center bg-parisNight px-6 py-8">
      <div className="w-full max-w-5xl">
        <p className="mb-3 text-center text-xs uppercase tracking-[0.3em] text-rose-200/80">Scene {sceneIndex + 1} / 4</p>
        <h2 className="mb-6 text-center text-2xl text-rose-50">{sceneLabels[sceneIndex] || 'Finale'}</h2>

        {sceneIndex === 0 ? <HeartbeatScene roomData={roomData} participants={participants} uid={uid} onHoldComplete={onHeartbeat} /> : null}
        {sceneIndex === 1 ? (
          <SimultaneousRevealScene roomData={roomData} participants={participants} uid={uid} onSubmit={onReveal} />
        ) : null}
        {sceneIndex === 2 ? <LetterScene roomData={roomData} participants={participants} uid={uid} onSendLetter={onLetter} /> : null}
        {sceneIndex >= 3 ? <FarewellScene /> : null}

        <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-3 rounded-2xl border border-rose-100/25 bg-rose-100/10 p-4 md:flex-row">
          <button
            onClick={() => onReadyToggle(!amReady)}
            className={`flex-1 rounded-lg px-4 py-3 transition ${
              amReady ? 'bg-emerald-400/20 text-emerald-100' : 'bg-rose-100/20 text-rose-50 hover:bg-rose-100/30'
            }`}
          >
            {amReady ? 'You Are Ready' : 'Mark Ready'}
          </button>
          <button
            onClick={onAdvance}
            disabled={!allReady}
            className={`flex-1 rounded-lg px-4 py-3 transition ${
              allReady ? 'bg-rose-100/25 text-rose-50 hover:bg-rose-100/35' : 'bg-rose-100/10 text-rose-100/60'
            }`}
          >
            Advance Together
          </button>
        </div>
      </div>
    </main>
  );
}