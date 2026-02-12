# Je vous aime Backend (Fastify + Socket.IO + Prisma)

Backend-authoritative, real-time Room 1 (Foyer) logic for two participants.

## Stack
- Fastify (TypeScript)
- Socket.IO for real-time sync
- PostgreSQL + Prisma for persistent truth

## Run
1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Install deps:
   - `npm install`
3. Generate Prisma client:
   - `npm run prisma:generate`
4. Run migrations:
   - `npm run prisma:migrate`
5. Start dev server:
   - `npm run dev`

Default port is `4000`.

## Foyer invariants enforced server-side
- Exactly two participants (`playerA`, `playerB`) required.
- Hold completes only on synchronized overlap across threshold.
- Any release/disconnect during hold resets progress to `DARK`.
- State machine is strict:
  - `DARK -> LIGHT_IN_PROGRESS -> LIT -> NOTE_ENTRY -> NOTE_LOCKED`
- Crisis sentence is one-line, server-limited, and immutable after dual confirm.
- Backend ignores bypass attempts once `NOTE_LOCKED`.

## Core events
- `foyer:event` with `hold_started`, `hold_interrupted`, `hold_completed`, `note_locked`
- `foyer:state` for authoritative snapshots

## HTTP endpoints
- `POST /api/houses/create`
- `POST /api/houses/join`
- `GET /api/foyer/:houseSessionId/state`
- `POST /api/foyer/intent`
