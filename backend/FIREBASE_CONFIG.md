# Firebase Backend Configuration

## Overview

This document describes the Firebase backend setup for "Je vous aime" - a romantic interactive experience connecting two users in real-time.

## Architecture

### Firebase Services Used

1. **Firebase Authentication** - Anonymous authentication for users
2. **Cloud Firestore** - Real-time database for room and participant data
3. **Security Rules** - Firestore rules to restrict access to authenticated room participants

### Data Structure

```
/rooms/{roomId}
├── roomId: string (8-char alphanumeric, auto-generated)
├── createdAt: timestamp
├── createdBy: string (UID of creator)
├── initialScene: string ("ENTRANCE")
├── flowStep: string ("waiting" | "role" | "experience" | "completed")
├── sceneIndex: number (0-4)
├── sceneReady: object (uid -> boolean)
├── sceneData: object
│   ├── heartbeatHolds: object
│   ├── reveals: object
│   └── letters: object
├── participants: object
│   └── {uid}: object
│       ├── role: string ("userA" | "userB")
│       ├── joinedAt: timestamp
│       └── lastSeen: timestamp
├── userA: string (UID of first participant)
├── userB: string (UID of second participant, null until joined)
└── roles: object (uid -> role mapping for backwards compatibility)
```

## Firebase Setup

### 1. Authentication Setup

**Frontend Configuration** (`frontend/src/firebase.js`):
- Uses Firebase Web SDK
- Implements anonymous authentication via `signInAnonymously()`
- Each user gets a unique UID automatically
- UIDs are used throughout the app for participant tracking

**Backend Configuration** (`backend/server.js`):
- Uses Firebase Admin SDK
- Initialized with service account credentials from environment
- Admin access allows backend to create/modify rooms and enforce rules

### 2. Firestore Setup

**Collection Structure**:
```
firestore/
└── rooms/ (collection)
    └── {roomId}/ (documents)
```

**Indexes** (if needed):
- None required for basic queries
- Composite indexes may be needed if querying across multiple fields

### 3. Firestore Security Rules

**File**: `frontend/firestore.rules`

**Rules Summary**:
```
- Only authenticated users (request.auth != null) can access rooms
- Users can only read/write rooms they are participants in
  (request.auth.uid must be in room.participants)
- Room creation is restricted (should be initiated from backend)
```

**Why These Rules**:
1. **Authentication Required**: Prevents anonymous database access
2. **Participant Restriction**: Only room members can see/modify room data
3. **Data Privacy**: Rooms are completely hidden from non-participants
4. **Backend Control**: Creation/joining through backend APIs ensures proper initialization

## Backend API Endpoints

### Create Room (POST `/rooms/create`)

**Request**:
```json
{
  "uid": "user-id-from-firebase-auth"
}
```

**Response**:
```json
{
  "roomId": "ABC12XYZ",
  "userRole": "userA"
}
```

**Error Responses**:
- `400` - Missing uid or invalid input
- `500` - Database error

**Backend Function**: `createRoom(uid)`
- Generates unique 8-character roomId
- Assigns user as `userA`
- Initializes room with ENTRANCE scene
- Stores UID in participants

### Join Room (POST `/rooms/join`)

**Request**:
```json
{
  "roomId": "ABC12XYZ",
  "uid": "user-id-from-firebase-auth"
}
```

**Response**:
```json
{
  "roomId": "ABC12XYZ",
  "userRole": "userA/userB",
  "message": "Successfully joined as userB."
}
```

**Error Responses**:
- `400` - Missing roomId/uid or invalid format
- `404` - Room not found
- `409` - Room full (max 2 participants)
- `500` - Database error

**Backend Function**: `joinRoom(roomId, uid)`
- Validates roomId format (8 alphanum chars)
- Checks if room exists
- Checks if room has capacity
- Assigns user as `userA` (if empty) or `userB`
- Prevents duplicate joins (idempotent)

### Get Room (GET `/rooms/:roomId?uid=USER_ID`)

**Query Parameters**:
- `uid` (required via query param or `X-User-Id` header)

**Response**:
```json
{
  "roomId": "ABC12XYZ",
  "createdAt": 1707830400000,
  "createdBy": "orig-uid",
  "initialScene": "ENTRANCE",
  "flowStep": "waiting",
  "sceneIndex": 0,
  "participants": {
    "uid1": {
      "role": "userA",
      "joinedAt": 1707830400000,
      "lastSeen": 1707830405000
    }
  },
  "userA": "uid1",
  "userB": null,
  ...
}
```

**Error Responses**:
- `400` - Missing uid
- `401` - No user authentication
- `403` - User not a room participant
- `404` - Room not found
- `500` - Database error

**Backend Function**: `getRoomById(roomId, uid)`
- Validates room exists
- Verifies user is participant
- Returns full room data
- Enforces access control

### Update Scene Data (POST `/rooms/scene-data`)

**Request**:
```json
{
  "roomId": "ABC12XYZ",
  "uid": "user-id",
  "path": "heartbeatHolds",
  "value": { "uid1": 5, "uid2": 12 }
}
```

**Response**:
```json
{ "ok": true }
```

**Error Responses**: (Similar to getRoomById)

**Backend Function**: `updateSceneData(roomId, uid, path, value)`

### Mark Ready (POST `/rooms/ready`)

**Request**:
```json
{
  "roomId": "ABC12XYZ",
  "uid": "user-id",
  "ready": true
}
```

**Response**:
```json
{ "ok": true }
```

**Backend Function**: `markReady(roomId, uid, ready)`

### Update Presence (POST `/rooms/presence`)

**Request**:
```json
{
  "roomId": "ABC12XYZ",
  "uid": "user-id"
}
```

**Response**:
```json
{ "ok": true }
```

**Backend Function**: `updatePresence(roomId, uid)`
- Updates user's `lastSeen` timestamp
- Called to maintain presence/heartbeat

## Utility Functions

**File**: `backend/lib/roomService.js`

### Exported Functions

1. **generateRoomId()** → `string`
   - Creates random 8-character alphanumeric ID

2. **roomRef(roomId)** → `DocumentReference`
   - Helper to get Firestore room document reference

3. **createRoom(uid)** → `Promise<{roomId, userRole}>`
   - Creates new room with caller as userA

4. **joinRoom(roomId, uid)** → `Promise<{roomId, userRole, message}>`
   - Joins existing room as userB or existing userA

5. **getRoomById(roomId, uid)** → `Promise<Room>`
   - Retrieves room data with access control

6. **updateSceneData(roomId, uid, path, value)** → `Promise<{ok: boolean}>`
   - Updates nested scene data

7. **markReady(roomId, uid, ready)** → `Promise<{ok: boolean}>`
   - Marks user ready for transition

8. **updatePresence(roomId, uid)** → `Promise<{ok: boolean}>`
   - Updates lastSeen timestamp

9. **isValidRoomId(roomId)** → `boolean`
   - Validates roomId format

## Error Handling

All backend functions throw errors with descriptive messages:

```javascript
try {
  const room = await createRoom(uid);
} catch (error) {
  // error.message contains detailed error info
  // Examples:
  // "UID is required to create a room."
  // "Room not found."
  // "Unauthorized. You are not a participant in this room."
  // "Room is full. Maximum 2 participants allowed."
}
```

**HTTP Status Codes**:
- `400` - Bad request (missing params, invalid format)
- `401` - Unauthorized (auth required)
- `403` - Forbidden (not participant)
- `404` - Not found (room doesn't exist)
- `409` - Conflict (room full, already exists)
- `500` - Server error

## Environment Variables

**Backend** (`.env`):
```
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

**Frontend** (`.env.local`):
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_USE_FIRESTORE_EMULATOR=false
```

## Flow: User Journey

### User A (Room Creator)
1. User A opens app → anonymous auth signs them in
2. User A clicks "Begin Your Evening"
3. **Backend**: `/rooms/create` called with User A's UID
4. Room created with User A as `userA`, `flowStep: 'waiting'`
5. App stores roomId and UID
6. Share roomId with User B

### User B (Room Joiner)
1. User B opens app → anonymous auth signs them in
2. User B enters roomId
3. **Backend**: `/rooms/join` called with User B's UID
4. Transaction checks if `userA` is set
5. Since `userA` is User A, User B assigned as `userB`
6. Both users now in room, ready to proceed

### Invalid Scenarios Handled

1. **Invalid RoomId**: Validation rejects before querying
2. **Room Not Found**: 404 error returned
3. **Room Full**: 409 error when trying to join with 2+ participants
4. **Unauthorized User**: 403 when non-participant tries to access
5. **Auth Failures**: 401 when trying to access without authentication

## Transactions & Consistency

Critical operations use Firestore transactions to ensure consistency:

- **joinRoom**: Uses transaction to atomically:
  1. Read current state
  2. Validate room exists and has capacity
  3. Assign role (userA or userB)
  4. Update participants
  5. Prevent race conditions

## Security Considerations

1. **Client-Side**: Firestore rules enforce participant restrictions
2. **Backend**: Server-side validation of all operations
3. **UIDs**: Used as sole identifier (no passwords stored)
4. **Timestamps**: All timestamps are server-generated (`serverTimestamp()`)
5. **Immutable IDs**: Room IDs and participant UIDs never change
6. **One-Way Operations**: Room creation initializes with fixed scene
