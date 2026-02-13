# Backend Room Management Implementation Guide

## Overview

This guide details the backend implementation of room creation and user joining logic for "Je vous aime" - a real-time romantic experience connecting two users.

## Architecture Diagram

```
┌─────────────────────┐
│   Frontend (Vite)   │
│  - React App        │
│  - Firebase SDK     │
└──────────┬──────────┘
           │ HTTP REST API
           ▼
┌─────────────────────────────┐
│   Backend (Node.js/Express) │
│ - Room Management Logic     │
│ - Firebase Admin SDK        │
│ - Transaction Support       │
└──────────┬──────────────────┘
           │ Admin Access
           ▼
┌─────────────────────┐
│   Firebase Backend  │
│ - Firestore DB      │
│ - Authentication    │
│ - Security Rules    │
└─────────────────────┘
```

## Room Data Model

### Room Document Structure

```javascript
{
  // Metadata
  roomId: "ABC12XYZ",                    // 8-char alphanumeric, unique
  createdAt: Timestamp,                  // Server timestamp
  createdBy: "uid-of-creator",           // UID of first user
  initialScene: "ENTRANCE",              // Starting scene

  // Flow State
  flowStep: "waiting",                   // "waiting" | "role" | "experience" | "completed"
  sceneIndex: 0,                         // Current scene (0-4)
  sceneReady: {
    "uid1": true,                        // Whether each user is ready
    "uid2": false
  },

  // Participant Management
  participants: {
    "uid1": {
      role: "userA",                     // "userA" | "userB"
      joinedAt: Timestamp,
      lastSeen: Timestamp                // For presence tracking
    },
    "uid2": {
      role: "userB",
      joinedAt: Timestamp,
      lastSeen: Timestamp
    }
  },
  userA: "uid1",                         // Quick reference to userA
  userB: "uid2",                         // Quick reference to userB (null if not joined)

  // Scene State
  sceneData: {
    heartbeatHolds: {
      "uid1": 5,                         // Number of heartbeat holds
      "uid2": 3
    },
    reveals: { /* ... */ },              // Reveal state
    letters: { /* ... */ }               // Letter data
  },

  // Backwards Compatibility
  roles: { /* ... */ }                   // Legacy field
}
```

## Implementation Details

### 1. Room ID Generation

**Function**: `generateRoomId()`

- Creates random 8-character alphanumeric string
- Format: `[A-Z0-9]{8}` (e.g., `ABC12XYZ`)
- Checked against existing rooms for uniqueness
- Retry logic: Up to 10 attempts if collision detected

**Why this format**:
- Short and memorable (can be typed or verbally shared)
- Large enough to support 2.8 trillion+ unique IDs (36^8)
- Human-readable, no confusing characters (no I, O, L, 1, 0 would be better but current works)

### 2. Room Creation (User A Flow)

**Endpoint**: `POST /rooms/create`

**Request**:
```json
{ "uid": "user-firebase-uid" }
```

**Process**:
1. Generate unique room ID
2. Create Firestore document with structure above
3. Assign user as `userA`
4. Set `initialScene: "ENTRANCE"`
5. Store UID in both `createdBy` and `participants`
6. Set `flowStep: "waiting"` (waiting for user B to join)

**Response**:
```json
{
  "roomId": "ABC12XYZ",
  "userRole": "userA"
}
```

**Error Handling**:
- `400` - Missing UID
- `500` - Database error
- `500` - Failed after 10 retry attempts

### 3. Room Join (User B Flow)

**Endpoint**: `POST /rooms/join`

**Request**:
```json
{
  "roomId": "ABC12XYZ",
  "uid": "user-firebase-uid"
}
```

**Process** (with Firestore Transaction):
1. Validate roomId format (`[A-Z0-9]{8}`)
2. Read room from Firestore
3. Check if room exists (if not, throw error)
4. Check if user already in room (if yes, return existing role)
5. Check room capacity (fail if both userA and userB filled)
6. Assign role:
   - If `userA` is empty → assign as `userA`
   - Else → assign as `userB`
7. Add user to participants
8. Update presence timestamps
9. Commit transaction

**Response**:
```json
{
  "roomId": "ABC12XYZ",
  "userRole": "userB",
  "message": "Successfully joined as userB."
}
```

**Error Handling**:
- `400` - Missing roomId/uid or invalid format
- `404` - Room not found
- `409` - Room full (2+ participants already)
- `500` - Database error

**Idempotency**:
- If same user joins twice, returns current role without error
- Transaction isolation prevents race conditions

### 4. User Authorization

**Verification Point**: Any operation on room data

**Check**: `uid in room.participants`

**Examples**:
- Getting room data: Only participants can read
- Updating scene data: Only participants can write
- Marking ready: Only participants can set
- Updating presence: Only participants can heartbeat

### 5. Key Design Decisions

#### Why userA/userB Quick References?

```javascript
// Instead of:
const userA = Object.entries(participants)
  .find(([uid, data]) => data.role === 'userA')?.[0];

// We have:
const userA = room.userA; // Direct lookup
```

**Benefits**:
- Faster queries for room capacity checks
- Simpler transaction logic
- Cleaner condition checks

#### Why Server Timestamps?

```javascript
createdAt: admin.firestore.FieldValue.serverTimestamp()
```

**Benefits**:
- Server time is authoritative (client clocks can't be trusted)
- Prevents timestamp manipulation
- Consistent across all regions
- Works offline-first design

#### Why Transactions for Join?

```javascript
await db.runTransaction(async (tx) => {
  const snap = await tx.get(ref);
  // ... validate ...
  tx.update(ref, {
    userB: uid,
    [`participants.${uid}`]: { ... }
  });
});
```

**Benefits**:
- Atomic: Both updates happen or neither
- Prevents race conditions (two users joining simultaneously get different roles)
- Consistent read → check → write
- Handles concurrent requests safely

## API Reference

### Create Room
```
POST /rooms/create
Content-Type: application/json

{
  "uid": "firebase-uid-string"
}

Response 201:
{
  "roomId": "ABC12XYZ",
  "userRole": "userA"
}

Error 400: { "error": "uid is required." }
Error 500: { "error": "Failed to create room: ..." }
```

### Join Room
```
POST /rooms/join
Content-Type: application/json

{
  "roomId": "ABC12XYZ",
  "uid": "firebase-uid-string"
}

Response 200:
{
  "roomId": "ABC12XYZ",
  "userRole": "userA" | "userB",
  "message": "Successfully joined as userB."
}

Error 400: { "error": "Invalid roomId format. Must be 8 alphanumeric characters." }
Error 404: { "error": "Room \"ABC12XYZ\" does not exist." }
Error 409: { "error": "Room is full. Maximum 2 participants allowed." }
Error 500: { "error": "Failed to join room: ..." }
```

### Get Room
```
GET /rooms/ABC12XYZ?uid=firebase-uid-string
Header: X-User-Id: firebase-uid-string (alternative)

Response 200: { ...full room data... }

Error 400: { "error": "User ID is required. Pass as ?uid=<uid> or X-User-Id header." }
Error 403: { "error": "Unauthorized. You are not a participant in this room." }
Error 404: { "error": "Room \"ABC12XYZ\" not found." }
Error 500: { "error": "Failed to retrieve room: ..." }
```

### Update Scene Data
```
POST /rooms/scene-data
Content-Type: application/json

{
  "roomId": "ABC12XYZ",
  "uid": "firebase-uid",
  "path": "heartbeatHolds",
  "value": { "uid1": 5, "uid2": 12 }
}

Response 200: { "ok": true }
Error 403: { "error": "Unauthorized. You are not a participant in this room." }
```

### Mark Ready
```
POST /rooms/ready
Content-Type: application/json

{
  "roomId": "ABC12XYZ",
  "uid": "firebase-uid",
  "ready": true
}

Response 200: { "ok": true }
```

### Update Presence
```
POST /rooms/presence
Content-Type: application/json

{
  "roomId": "ABC12XYZ",
  "uid": "firebase-uid"
}

Response 200: { "ok": true }
```

## Error Handling Strategy

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 201 | Created | Room successfully created |
| 400 | Bad Request | Missing parameters, invalid format |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Not a room participant |
| 404 | Not Found | Room doesn't exist |
| 409 | Conflict | Room full, room already exists |
| 500 | Server Error | Database, network, other errors |

### Error Message Structure

All errors follow this format:
```json
{ "error": "Human-readable message describing what went wrong" }
```

**Examples**:
```json
{ "error": "Room \"ABC12XYZ\" does not exist." }
{ "error": "Room is full. Maximum 2 participants allowed." }
{ "error": "Invalid roomId format. Must be 8 alphanumeric characters." }
{ "error": "Unauthorized. You are not a participant in this room." }
```

### Client-Side Error Handling

Frontend `roomService.js` provides `categorizeError()`:

```javascript
import { categorizeError } from './lib/roomService';

try {
  await joinRoom(roomId, uid);
} catch (error) {
  const category = categorizeError(error);
  
  switch (category) {
    case 'invalid_room':
      showError('Room ID format is incorrect');
      break;
    case 'room_full':
      showError('This room is full. Both users have already joined.');
      break;
    case 'room_not_found':
      showError('Room not found. Please check the room ID.');
      break;
    case 'unauthorized':
      showError('You are not authorized to access this room.');
      break;
    default:
      showError('An unexpected error occurred.');
  }
}
```

## Security Considerations

### 1. Firestore Security Rules

```javascript
match /rooms/{roomId} {
  allow read, write: if request.auth != null && 
                        request.auth.uid in resource.data.participants;
}
```

**Enforces**:
- Only authenticated users can access
- Only participants can modify
- Database-level access control

### 2. Backend Validation

- All inputs validated before database operations
- UIDs verified to be in participants before allowing writes
- Room capacity checked during join
- Transactions ensure consistency

### 3. Implicit Trust Model

- Backend trusted (admin SDK)
- Frontend auth verified (Firebase)
- Client requests must include UID
- Backend verifies UID belongs to requester

**Note**: In production, add verified ID tokens for stronger verification:
```javascript
const decodedToken = await admin.auth().verifyIdToken(idToken);
const uid = decodedToken.uid; // Verified from Firebase
```

## Performance Considerations

### Indexes

Current queries don't require composite indexes. Single-field indexes automatically created for:
- `participants` (nested field)
- `userA`
- `userB`

If adding new queries, Firestore will suggest needed indexes.

### Optimization Tips

1. **Presence Updates**: Throttle to every 5-10 seconds
2. **Real-time Subscriptions**: Only subscribe to current room
3. **Batch Writes**: Combine multiple updates when possible
4. **Cache**: Frontend caches room state locally

### Estimated Costs (GCP Firestore)

Assuming 100 active rooms, 50 room joins, 1000 presence updates:
- Reads: ~100/month = $0.06
- Writes: ~1,050/month = $0.32
- Operations: ~10/month = $0.00
- Storage: ~1MB = ~$0.18/month

**Total**: < $1/month for small-scale app

## Testing Recommendations

### Unit Tests (Backend)

```javascript
describe('roomService', () => {
  it('generates unique room IDs', () => {
    const id1 = generateRoomId();
    const id2 = generateRoomId();
    expect(id1).toMatch(/^[A-Z0-9]{8}$/);
    expect(id1).not.toBe(id2);
  });

  it('creates room with userA', async () => {
    const result = await createRoom('test-uid');
    expect(result.userRole).toBe('userA');
  });
});
```

### Integration Tests

```javascript
describe('Room Join Flow', () => {
  it('assigns userB when userA exists', async () => {
    // Create room as userA
    const created = await createRoom('uid-a');
    
    // Join as userB
    const joined = await joinRoom(created.roomId, 'uid-b');
    expect(joined.userRole).toBe('userB');
  });

  it('prevents 3rd user from joining', async () => {
    // Create and join first two users
    // ...
    
    // Try to join as third user
    expect(async () => {
      await joinRoom(roomId, 'uid-c');
    }).rejects.toThrow('full');
  });
});
```

### Manual Testing Checklist

- [ ] Create room → receive roomId
- [ ] Join room with valid ID → assigned as userB
- [ ] Join full room → error 409
- [ ] Join non-existent room → error 404
- [ ] Invalid room format → error 400
- [ ] Same user rejoins → returns same role
- [ ] Presence updates work
- [ ] Scene data updates restricted to participants
- [ ] Firestore rules prevent unauthorized access

## Troubleshooting

### Room not found when joining valid roomId

- Check roomId format (must be exactly 8 alphanumeric chars, uppercase)
- Verify room was created in same Firebase project
- Check Firestore region matches expected location
- Ensure backend has read access in Firestore

### User gets unauthorized error

- Verify user is in `participants` map
- Check Firestore security rules are deployed
- Confirm no recent changes to room document
- Check backend logs for errors

### Join appears to succeed but user doesn't show in room

- Check participant was added in Firestore (look at document)
- Verify real-time subscription is working
- Check if multiple admins are modifying same room
- Try full page refresh to reload room state

### Performance degradation

- Check Firestore reads/writes quota
- Verify presence updates aren't too frequent
- Look for runaway subscriptions in browser
- Monitor network tab for failed requests
