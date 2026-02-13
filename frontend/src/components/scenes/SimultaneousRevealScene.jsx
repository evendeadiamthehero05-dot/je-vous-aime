import { useState } from 'react';
import SceneShell from '../SceneShell';

export default function SimultaneousRevealScene({ roomData, participants, uid, onSubmit }) {
  const [text, setText] = useState('');
  const reveals = roomData?.sceneData?.reveals || {};
  const readyToReveal = participants.length >= 2 && participants.every((id) => reveals[id]);

  return (
    <SceneShell
      title="Simultaneous Reveal"
      subtitle="Type your hidden thought. It reveals only when both are ready."
    >
      <div className="mx-auto max-w-xl">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-xl border border-rose-100/35 bg-rose-950/35 px-4 py-3 text-rose-50 outline-none"
          placeholder="A secret thought"
        />
        <button
          onClick={() => onSubmit(uid, text)}
          className="mt-3 w-full rounded-xl bg-rose-100/20 px-4 py-3 text-rose-50 transition hover:bg-rose-100/30"
        >
          Seal My Reveal
        </button>

        {readyToReveal ? (
          <div className="mt-6 space-y-2 rounded-xl border border-rose-100/25 bg-rose-100/10 p-4">
            {participants.map((id, index) => (
              <p key={id} className="text-rose-50">
                Soul {index + 1}: {reveals[id]}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-rose-100/80">Both messages will unveil together.</p>
        )}
      </div>
    </SceneShell>
  );
}