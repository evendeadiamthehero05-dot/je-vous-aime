import { useState } from 'react';
import SceneShell from '../SceneShell';

export default function LetterScene({ roomData, participants, uid, onSendLetter }) {
  const [text, setText] = useState('');
  const letters = roomData?.sceneData?.letters || {};
  const sentByMe = Boolean(letters[uid]);

  return (
    <SceneShell
      title="Letter Scene"
      subtitle="Write a letter and send it into the night."
    >
      <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-rose-100/25 bg-rose-100/10 p-4">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-rose-200/80">Your Letter</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            className="soft-scrollbar w-full rounded-lg border border-rose-100/35 bg-rose-950/35 px-3 py-2 text-rose-50 outline-none"
            placeholder="Write from the heart..."
          />
          <button
            onClick={() => onSendLetter(uid, text)}
            className="mt-3 w-full rounded-lg bg-rose-100/20 px-3 py-2 text-rose-50 transition hover:bg-rose-100/30"
          >
            Send Letter
          </button>
          {sentByMe ? <p className="mt-2 text-sm text-rose-100/70">Delivered.</p> : null}
        </div>
        <div className="rounded-xl border border-rose-100/25 bg-rose-100/10 p-4">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-rose-200/80">Letters Received</p>
          <div className="space-y-2 text-rose-50">
            {participants
              .filter((id) => letters[id])
              .map((id, index) => (
                <p key={id} className="rounded-lg border border-rose-100/20 bg-rose-100/5 p-3">
                  Soul {index + 1}: {letters[id]}
                </p>
              ))}
            {!Object.keys(letters).length ? <p className="text-rose-100/70">No letters yet.</p> : null}
          </div>
        </div>
      </div>
    </SceneShell>
  );
}