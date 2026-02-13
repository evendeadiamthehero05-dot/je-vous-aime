# Backend Implementation - Quick Start

## What Was Implemented

Complete Firebase backend for real-time room management connecting two users:

- ✅ **Room Creation** - Auto-generates unique roomId, assigns User A
- ✅ **Room Joining** - Automatic userA/userB assignment, prevents >2 users
- ✅ **Access Control** - Only authenticated participants can access rooms
- ✅ **Error Handling** - Comprehensive error handling for all scenarios
- ✅ **Real-time Sync** - Firestore integration for instant updates

## Files Overview

### 1. Backend Utility Library
**`backend/lib/roomService.js`** (9 exported functions)
- `createRoom(uid)` - Create room with auto-generated ID
- `joinRoom(roomId, uid)` - Join with auto user role assignment
- `getRoomById(roomId, uid)` - Retrieve room (access-controlled)
- `generateRoomId()` - Create unique 8-char IDs
- `updateSceneData(), markReady(), updatePresence()` - Room operations
- `isValidRoomId()` - Validate format

### 2. Updated Backend Server
**`backend/server.js`** - Integrated all room management functions
- All endpoints enhanced with error handling
- Added `/rooms/:roomId` GET endpoint
- All operations require UID verification
- Transaction-based join logic (race-condition safe)

### 3. Firestore Security Rules
**`frontend/firestore.rules`**
```javascript
// Only authenticated users who are room participants can access
allow read, write: if request.auth != null && 
                      request.auth.uid in resource.data.participants;
```

### 4. Frontend Integration
**`frontend/src/lib/roomService.js`** - Updated client utilities
- `createRoom(uid)` - Now generates roomId server-side
- `joinRoom()` - Enhanced error handling
- `categorizeError()` - Helper for UI error messages
- `healthCheck()` - Verify backend status

### 5. Documentation
- **`backend/FIREBASE_CONFIG.md`** - Architecture & setup
- **`backend/IMPLEMENTATION_GUIDE.md`** - Detailed implementation docs
- **`backend/API_REFERENCE.md`** - Complete API endpoints

## Quick Usage

### User A: Create Room
```javascript
import { createRoom } from './lib/roomService';

const { roomId, userRole } = await createRoom(uid);
// roomId: "ABC12XYZ"
// userRole: "userA"
// → Share roomId with User B
```

### User B: Join Room
```javascript
import { joinRoom } from './lib/roomService';

const { roomId, userRole, message } = await joinRoom('ABC12XYZ', uid);
// roomId: "ABC12XYZ"
// userRole: "userB"
// message: "Successfully joined as userB."
```

### Both: Real-time Updates
```javascript
import { subscribeRoom } from './lib/roomService';

subscribeRoom(roomId, (room) => {
  console.log('Room updated:', room);
  // Both users see updates instantly via Firestore
});
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/rooms/create` | Create new room (User A) |
| POST | `/rooms/join` | Join existing room (User B) |
| GET | `/rooms/:roomId` | Get room data (participants only) |
| POST | `/rooms/scene-data` | Update scene state |
| POST | `/rooms/ready` | Mark user ready for transition |
| POST | `/rooms/presence` | Send heartbeat/presence update |
| GET | `/rooms/:roomId/exists` | Check if room exists |

All endpoints return `{ "error": "..." }` on failure.

## Error Handling

```javascript
import { joinRoom, categorizeError } from './lib/roomService';

try {
  await joinRoom('ABC12XYZ', uid);
} catch (error) {
  const type = categorizeError(error);
  
  if (type === 'room_not_found') {
    // Room code incorrect or expired
  } else if (type === 'room_full') {
    // Both participants already joined
  } else if (type === 'invalid_room') {
    // Wrong format (must be 8 alphanumeric)
  }
}
```

## Environment Setup

### Backend `.env`
```
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### Frontend `.env.local`
```
VITE_BACKEND_URL=http://localhost:4000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

## Running Local

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev
# Server listening on http://localhost:4000

# Terminal 2: Frontend  
cd frontend
npm install
npm run dev
# App running on http://localhost:5173
```

## Room Data Structure

```javascript
{
  roomId: "ABC12XYZ",
  createdAt: Timestamp,
  initialScene: "ENTRANCE",
  flowStep: "waiting",
  sceneIndex: 0,
  
  // Participant Management
  userA: "uid-a",          // First user
  userB: "uid-b",          // Second user (null until joined)
  participants: {
    "uid-a": {
      role: "userA",
      joinedAt: Timestamp,
      lastSeen: Timestamp
    },
    "uid-b": {
      role: "userB",
      joinedAt: Timestamp,
      lastSeen: Timestamp
    }
  },
  
  // Synchronization
  sceneReady: { "uid-a": true, "uid-b": false },
  sceneData: { /* scene-specific data */ }
}
```

## Key Features

- **8-Character Room Codes** - Short, shareable IDs
- **Automatic Role Assignment** - No config needed
- **Transaction-Safe** - Handles concurrent joins
- **Real-time Sync** - Firestore subscriptions
- **Access-Controlled** - Only participants access data
- **Presence Tracking** - Know if users are active
- **Comprehensive Errors** - Clear error messages

## Function Signatures

```typescript
// Creation & Joining
createRoom(uid: string): Promise<{roomId: string, userRole: 'userA'}>
joinRoom(roomId: string, uid: string): Promise<{roomId: string, userRole: 'userA'|'userB', message: string}>

// Retrieval & Updates
getRoomById(roomId: string, uid: string): Promise<RoomData>
updateSceneData(roomId: string, uid: string, path: string, value: any): Promise<{ok: true}>
markReady(roomId: string, uid: string, ready: boolean): Promise<{ok: true}>
updatePresence(roomId: string, uid: string): Promise<{ok: true}>

// Utilities
generateRoomId(): string
isValidRoomId(roomId: string): boolean
categorizeError(error: Error): ErrorCategory
```

## Frontend Implementation Pattern

```javascript
// 1. On page load - ensure user is auth'd
const user = await ensureAnonymousAuth();

// 2. User clicks "Begin Your Evening"
async function handleStartExperience() {
  try {
    const { roomId, userRole } = await createRoom(user.uid);
    localStorage.setItem('roomId', roomId);
    localStorage.setItem('userRole', userRole);
    navigateTo('/waiting-room');
  } catch (error) {
    showError(error.message);
  }
}

// 3. User enters room code
async function handleJoinRoom(codeInput) {
  try {
    const { roomId, userRole } = await joinRoom(codeInput, user.uid);
    localStorage.setItem('roomId', roomId);
    localStorage.setItem('userRole', userRole);
    navigateTo('/experience');
  } catch (error) {
    const type = categorizeError(error);
    if (type === 'room_not_found') {
      showError('Room code not found. Check spelling?');
    } else if (type === 'room_full') {
      showError('Room is full. Both users already joined.');
    }
  }
}

// 4. Real-time room monitoring
useEffect(() => {
  if (!roomId) return;
  
  const unsubscribe = subscribeRoom(roomId, (room) => {
    setRoomState(room);
    
    // Check if both users ready
    if (bothUsersReady(room)) {
      advanceToNextScene();
    }
  });
  
  return unsubscribe;
}, [roomId]);

// 5. Keep presence alive
useEffect(() => {
  const interval = setInterval(() => {
    heartbeatPresence(roomId, user.uid);
  }, 10000);
  
  return () => clearInterval(interval);
}, [roomId, user.uid]);
```

## Common Scenarios

### Scenario 1: User A starts experience
1. `POST /rooms/create { uid: "uid-a" }`
2. ← `{ roomId: "ABC12XYZ", userRole: "userA" }`
3. Display code "ABC12XYZ" to share

### Scenario 2: User B joins
1. `POST /rooms/join { roomId: "ABC12XYZ", uid: "uid-b" }`
2. ← `{ roomId: "ABC12XYZ", userRole: "userB", message: "..." }`
3. Both users now synced via Firestore subscription

### Scenario 3: Invalid code entered
1. `POST /rooms/join { roomId: "INVALID", uid: "uid-b" }`
2. ← `404 { error: "Room \"INVALID\" does not exist." }`
3. Show "Room code not found"

### Scenario 4: Room already full
1. User A creates room
2. User B joins → assigned userB
3. User C tries to join
4. `POST /rooms/join { roomId: "ABC12XYZ", uid: "uid-c" }`
5. ← `409 { error: "Room is full. Maximum 2 participants allowed." }`

## Testing Tips

1. **Test Room Creation**
   ```bash
   curl -X POST http://localhost:4000/rooms/create \
     -H "Content-Type: application/json" \
     -d '{"uid":"test-user-1"}'
   ```

2. **Test Room Join**
   ```bash
   curl -X POST http://localhost:4000/rooms/join \
     -H "Content-Type: application/json" \
     -d '{"roomId":"ABC12XYZ","uid":"test-user-2"}'
   ```

3. **Test Get Room**
   ```bash
   curl http://localhost:4000/rooms/ABC12XYZ?uid=test-user-1
   ```

4. **Watch Firestore Console**
   - Open Firebase Console → Firestore
   - See rooms collection update in real-time
   - Verify security rules working (only participants can read)

## Troubleshooting

**"Room not found"** after creating
- Check Firestore is deployed
- Verify backend can write to Firestore
- Check room ID format (8 alphanumeric chars)

**Join succeeds but data not syncing**
- Check Firestore subscription active
- Verify Firestore rules deployed
- Check browser DevTools network tab
- Ensure both users have same room ID

**"Unauthorized" error**
- Verify user UID matches request
- Check Firestore rules are deployed
- Ensure user is in room.participants

**Backend not starting**
- Check `PORT` env var (default 4000)
- Verify Firebase credentials valid
- Check node version compatibility
- Run `npm install` in backend folder

## Documentation Links

- **Architecture** → `backend/IMPLEMENTATION_GUIDE.md`
- **All Endpoints** → `backend/API_REFERENCE.md`
- **Firebase Setup** → `backend/FIREBASE_CONFIG.md`
- **Deliverables** → `DELIVERABLES.md`
