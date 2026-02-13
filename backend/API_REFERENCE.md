# Backend API Reference

## Base URL
```
http://localhost:4000
```

## Health Check

**Check if backend is running**

```
GET /health

Response 200:
{ "ok": true }
```

---

## Room Management

### Create Room

**Start a new experience as User A**

```http
POST /rooms/create
Content-Type: application/json

{
  "uid": "user-uid-from-firebase-auth"
}
```

**Response** `201 Created`:
```json
{
  "roomId": "ABC12XYZ",
  "userRole": "userA"
}
```

**Errors**:
- `400 Bad Request`: `{"error": "uid is required."}`
- `500 Server Error`: `{"error": "Failed to create room: ..."}`

**Backend Function**: `roomService.createRoom(uid)`

---

### Join Room

**Join an existing experience as User B**

```http
POST /rooms/join
Content-Type: application/json

{
  "roomId": "ABC12XYZ",
  "uid": "user-uid-from-firebase-auth"
}
```

**Response** `200 OK`:
```json
{
  "roomId": "ABC12XYZ",
  "userRole": "userB",
  "message": "Successfully joined as userB."
}
```

**Errors**:
- `400 Bad Request`: `{"error": "Invalid roomId format. Must be 8 alphanumeric characters."}`
- `404 Not Found`: `{"error": "Room \"ABC12XYZ\" does not exist."}`
- `409 Conflict`: `{"error": "Room is full. Maximum 2 participants allowed."}`
- `500 Server Error`: `{"error": "Failed to join room: ..."}`

**Backend Function**: `roomService.joinRoom(roomId, uid)`

**Notes**:
- Automatically assigns userB if userA exists
- Idempotent: Calling twice returns same role
- Transaction-based: Race-condition safe

---

### Get Room

**Retrieve current room state**

```http
GET /rooms/:roomId?uid=USER_UID
Header: X-User-Id: USER_UID (alternative)

GET /rooms/ABC12XYZ?uid=user-uid
```

**Response** `200 OK`:
```json
{
  "roomId": "ABC12XYZ",
  "createdAt": 1707830400000,
  "createdBy": "original-user-uid",
  "initialScene": "ENTRANCE",
  "flowStep": "waiting",
  "sceneIndex": 0,
  "sceneReady": {
    "user-uid-1": false,
    "user-uid-2": true
  },
  "participants": {
    "user-uid-1": {
      "role": "userA",
      "joinedAt": 1707830400000,
      "lastSeen": 1707830450000
    },
    "user-uid-2": {
      "role": "userB",
      "joinedAt": 1707830405000,
      "lastSeen": 1707830448000
    }
  },
  "userA": "user-uid-1",
  "userB": "user-uid-2",
  "sceneData": { ... }
}
```

**Errors**:
- `400 Bad Request`: `{"error": "User ID is required. Pass as ?uid=<uid> or X-User-Id header."}`
- `403 Forbidden`: `{"error": "Unauthorized. You are not a participant in this room."}`
- `404 Not Found`: `{"error": "Room \"ABC12XYZ\" not found."}`

**Backend Function**: `roomService.getRoomById(roomId, uid)`

**Notes**:
- Only participants can read room data
- Requires valid UID
- Links to Firestore security rules

---

## Room Operations

### Update Scene Data

**Store scene-specific data**

```http
POST /rooms/scene-data
Content-Type: application/json

{
  "roomId": "ABC12XYZ",
  "uid": "user-uid",
  "path": "heartbeatHolds",
  "value": {
    "user-uid-1": 5,
    "user-uid-2": 12
  }
}
```

**Response** `200 OK`:
```json
{ "ok": true }
```

**Errors**:
- `400 Bad Request`: `{"error": "roomId, uid, and path are required."}`
- `403 Forbidden`: `{"error": "Unauthorized. You are not a participant in this room."}`
- `404 Not Found`: `{"error": "Room \"ABC12XYZ\" not found."}`

**Backend Function**: `roomService.updateSceneData(roomId, uid, path, value)`

**Common Paths**:
- `heartbeatHolds` - Heartbeat interaction data
- `reveals` - Character revelation state
- `letters` - Love letter content

---

### Mark User Ready

**Indicate readiness for scene transition**

```http
POST /rooms/ready
Content-Type: application/json

{
  "roomId": "ABC12XYZ",
  "uid": "user-uid",
  "ready": true
}
```

**Response** `200 OK`:
```json
{ "ok": true }
```

**Errors**:
- `400 Bad Request`: `{"error": "roomId and uid are required."}`
- `403 Forbidden`: `{"error": "Unauthorized. You are not a participant in this room."}`
- `404 Not Found`: `{"error": "Room \"ABC12XYZ\" not found."}`

**Backend Function**: `roomService.markReady(roomId, uid, ready)`

**Notes**:
- Call with `ready: true` to indicate readiness
- Call with `ready: false` to unmark
- Changes sync in real-time to both users

---

### Update Presence

**Heartbeat/presence update (user is still active)**

```http
POST /rooms/presence
Content-Type: application/json

{
  "roomId": "ABC12XYZ",
  "uid": "user-uid"
}
```

**Response** `200 OK`:
```json
{ "ok": true }
```

**Errors**:
- `400 Bad Request`: `{"error": "roomId and uid are required."}`
- `403 Forbidden`: `{"error": "Unauthorized. You are not a participant in this room."}`
- `404 Not Found`: `{"error": "Room \"ABC12XYZ\" not found."}`

**Backend Function**: `roomService.updatePresence(roomId, uid)`

**Notes**:
- Updates `lastSeen` timestamp to current time
- Server-side timestamp (authoritative)
- Recommended every 5-10 seconds
- Prevents user timeout

---

## Flow Control

### Continue to Role Selection

**Initiate role selection phase**

```http
POST /rooms/continue
Content-Type: application/json

{
  "roomId": "ABC12XYZ"
}
```

**Response** `200 OK`:
```json
{ "ok": true }
```

**Notes**:
- Changes `flowStep` from "waiting" to "role"
- Called when both users joined or ready to proceed
- Usually called by room creator (User A)

---

### Choose User Role

**Select role in experience (e.g., storyteller vs. recipient)**

```http
POST /rooms/role
Content-Type: application/json

{
  "roomId": "ABC12XYZ",
  "uid": "user-uid",
  "role": "storyteller"
}
```

**Response** `200 OK`:
```json
{ "ok": true }
```

**Errors**:
- `400 Bad Request`: `{"error": "roomId, uid, role are required."}`
- `409 Conflict`: `{"error": "Role already taken."}` or `{"error": "Role already selected."}`

**Notes**:
- If both users select different roles, auto-advances to "experience"
- Prevents duplicate role selection
- Prevents role conflicts

---

### Advance Scene

**Move to next scene when both users are ready**

```http
POST /rooms/advance
Content-Type: application/json

{
  "roomId": "ABC12XYZ",
  "maxSceneIndex": 4
}
```

**Response** `200 OK`:
```json
{ "ok": true }
```

**Auto Behavior**:
- If both users ready: increments `sceneIndex`
- If `sceneIndex > maxSceneIndex`: sets `flowStep: "completed"`
- Clears `sceneReady` for next round

**Notes**:
- Uses transaction for atomic update
- Resets ready states after advancing
- Can be called frequently; only advances when conditions met

---

## Check Room Exists

**Verify room exists without requiring user participation**

```http
GET /rooms/:roomId/exists

GET /rooms/ABC12XYZ/exists
```

**Response** `200 OK`:
```json
{ "exists": true }
```

**Notes**:
- No authentication required
- Can be cached client-side
- Use to validate room ID before joining

---

## Error Response Format

All error responses use consistent format:

```json
{
  "error": "Human-readable error message"
}
```

**Common Error Scenarios**:

| Scenario | Status | Message |
|----------|--------|---------|
| Missing required field | 400 | `"roomId and uid are required."` |
| Invalid format | 400 | `"Invalid roomId format. Must be 8 alphanumeric characters."` |
| Auth required | 401 | `"User ID is required..."` |
| Not authorized | 403 | `"Unauthorized. You are not a participant in this room."` |
| Not found | 404 | `"Room \"ABC12XYZ\" not found."` |
| Resource conflict | 409 | `"Room is full. Maximum 2 participants allowed."` |
| Server error | 500 | `"Failed to create room: ..."` |

---

## Client Usage Examples

### Creating a Room (Frontend)

```javascript
import { createRoom } from './lib/roomService';

try {
  const { roomId, userRole } = await createRoom(uid);
  console.log(`Created room ${roomId} as ${userRole}`);
  // Share roomId with other user
} catch (error) {
  console.error('Failed to create room:', error.message);
}
```

### Joining a Room (Frontend)

```javascript
import { joinRoom, categorizeError } from './lib/roomService';

try {
  const { roomId, userRole, message } = await joinRoom('ABC12XYZ', uid);
  console.log(`Joined as ${userRole}`);
} catch (error) {
  const category = categorizeError(error);
  
  if (category === 'room_not_found') {
    showMessage('Room not found. Check the code.');
  } else if (category === 'room_full') {
    showMessage('Room is full.');
  } else if (category === 'invalid_room') {
    showMessage('Invalid room ID format.');
  }
}
```

### Monitoring Room State (Frontend)

```javascript
import { subscribeRoom, heartbeatPresence } from './lib/roomService';

// Real-time updates via Firestore
const unsubscribe = subscribeRoom(roomId, (room) => {
  if (room) {
    console.log('Room state:', room);
    const ready = room.sceneReady || {};
    if (ready[myUid] && ready[otherUid]) {
      // Both ready, can advance
    }
  }
});

// Send presence every 10 seconds
setInterval(() => {
  heartbeatPresence(roomId, uid);
}, 10000);

// Cleanup on unmount
return () => unsubscribe();
```

---

## Environment Configuration

### Backend

```bash
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### Frontend

```bash
VITE_BACKEND_URL=http://localhost:4000
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

---

## Rate Limiting & Quotas

### Suggested Limits (for production)

- Room creation: 1 per user per minute
- Presence updates: 1 per user per 5 seconds
- Scene data updates: 10 per room per second
- Scene advance: Depends on user readiness

Use middleware like `express-rate-limit`:

```javascript
import rateLimit from 'express-rate-limit';

const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  keyGenerator: (req) => req.body.uid
});

app.post('/rooms/create', createLimiter, async (req, res) => {
  // ...
});
```

---

## Migration & Versioning

### Current Version
- API Version: v1 (implicit, build into URLs in future)
- Firestore Schema Version: 1
- Changelog: None yet

### Future Versioning Strategy

```
GET /api/v2/rooms/:roomId
POST /api/v2/rooms/create
```

Maintain backwards compatibility with v1 as long as possible.
