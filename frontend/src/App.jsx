import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ensureAnonymousAuth } from './firebase';
import LandingPage from './pages/LandingPage';
import EntrancePage from './pages/EntrancePage';
import RoomPage from './pages/RoomPage';
import WaitingRoomPage from './pages/WaitingRoomPage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import ExperiencePage from './pages/ExperiencePage';
import {
  advanceSceneIfReady,
  chooseRole,
  continueToRoles,
  createRoom,
  heartbeatPresence,
  isParticipantOnline,
  joinRoom,
  setReady,
  subscribeRoom,
  updateSceneData,
  verifyRoom
} from './lib/roomService';

const MAX_SCENE_INDEX = 3;

function Screen({ children, keyName }) {
  return (
    <motion.div
      key={keyName}
      initial={{ opacity: 0, filter: 'blur(8px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(8px)' }}
      transition={{ duration: 0.9 }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const [uid, setUid] = useState('');
  const [phase, setPhase] = useState('landing');
  const [roomId, setRoomId] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    ensureAnonymousAuth()
      .then((user) => setUid(user.uid))
      .catch(() => setError('Unable to connect to Firebase auth.'));
  }, []);

  useEffect(() => {
    if (!roomId) {
      return undefined;
    }
    const unsub = subscribeRoom(roomId, (next) => {
      if (!next) {
        setError('Room not found.');
      }
      setRoomData(next);
    });
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !uid) {
      return undefined;
    }

    heartbeatPresence(roomId, uid).catch(() => {});
    const timer = setInterval(() => {
      heartbeatPresence(roomId, uid).catch(() => {});
    }, 8000);

    return () => clearInterval(timer);
  }, [roomId, uid]);

  const participants = useMemo(() => {
    if (!roomData?.participants) {
      return [];
    }
    return Object.entries(roomData.participants).map(([id, participant]) => ({
      uid: id,
      online: isParticipantOnline(participant)
    }));
  }, [roomData]);

  const participantIds = participants.map((p) => p.uid);
  const onlineCount = participants.filter((p) => p.online).length;

  async function handleCreateRoom(generatedRoomId) {
    try {
      setError('');
      const normalized = generatedRoomId.toUpperCase();
      await createRoom(normalized, uid);
      setRoomId(normalized);
    } catch {
      setError('Failed to create room. Please try again.');
    }
  }

  async function handleJoinRoom(inputRoomId) {
    try {
      setError('');
      const exists = await verifyRoom(inputRoomId);
      if (!exists) {
        setError('Room ID does not exist.');
        return;
      }
      await joinRoom(inputRoomId, uid);
      setRoomId(inputRoomId);
    } catch {
      setError('Could not join room.');
    }
  }

  async function handleContinueToRoles() {
    try {
      await continueToRoles(roomId);
    } catch {
      setError('Unable to continue.');
    }
  }

  async function handleSelectRole(role) {
    try {
      setError('');
      await chooseRole(roomId, uid, role);
    } catch (err) {
      setError(err.message || 'Role selection failed.');
    }
  }

  async function handleHeartbeat(userId) {
    await updateSceneData(roomId, `heartbeatHolds.${userId}`, true);
  }

  async function handleReveal(userId, text) {
    if (!text.trim()) {
      return;
    }
    await updateSceneData(roomId, `reveals.${userId}`, text.trim());
  }

  async function handleLetter(userId, text) {
    if (!text.trim()) {
      return;
    }
    await updateSceneData(roomId, `letters.${userId}`, text.trim());
  }

  async function handleReadyToggle(nextReady) {
    await setReady(roomId, uid, nextReady);
  }

  async function handleAdvance() {
    await advanceSceneIfReady(roomId, MAX_SCENE_INDEX);
  }

  function renderRoomFlow() {
    if (!roomData) {
      return (
        <Screen keyName="loading">
          <main className="flex min-h-screen items-center justify-center bg-parisNight">
            <p className="text-rose-100">Connecting to room...</p>
          </main>
        </Screen>
      );
    }

    if (roomData.flowStep === 'waiting') {
      return (
        <Screen keyName="waiting">
          <WaitingRoomPage
            roomId={roomId}
            participants={participants}
            onlineCount={onlineCount}
            onContinue={handleContinueToRoles}
          />
        </Screen>
      );
    }

    if (roomData.flowStep === 'role') {
      return (
        <Screen keyName="role">
          <RoleSelectionPage roomData={roomData} uid={uid} onSelectRole={handleSelectRole} error={error} />
        </Screen>
      );
    }

    return (
      <Screen keyName="experience">
        <ExperiencePage
          roomData={roomData}
          uid={uid}
          participants={participantIds}
          onHeartbeat={handleHeartbeat}
          onReveal={handleReveal}
          onLetter={handleLetter}
          onReadyToggle={handleReadyToggle}
          onAdvance={handleAdvance}
        />
      </Screen>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {phase === 'landing' ? <Screen keyName="landing"><LandingPage onBegin={() => setPhase('entrance')} /></Screen> : null}
      {phase === 'entrance' ? <Screen keyName="entrance"><EntrancePage onUnlock={() => setPhase('room')} /></Screen> : null}
      {phase === 'room' && !roomId ? (
        <Screen keyName="room-gate">
          <RoomPage onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} error={error} />
        </Screen>
      ) : null}
      {phase === 'room' && roomId ? renderRoomFlow() : null}
    </AnimatePresence>
  );
}