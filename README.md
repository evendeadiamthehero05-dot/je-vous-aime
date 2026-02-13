# Je vous aime Monorepo

This repository is now split into:
- `frontend/` React + Tailwind + Framer Motion client
- `backend/` Express + Firebase Admin API for shared room writes

## Quick Start
1. Frontend:
   - `cd frontend`
   - `copy .env.example .env`
   - fill Firebase values
2. Backend:
   - `cd backend`
   - `copy .env.example .env`
   - configure service account access (`FIREBASE_SERVICE_ACCOUNT_KEY` or ADC)
3. Install and run:
   - `npm install`
   - `npm run install:all`
   - `npm run dev:backend`
   - `npm run dev:frontend`

## Architecture
- Frontend reads realtime room state directly from Firestore.
- Frontend writes room state through backend endpoints.
- Backend enforces role conflict checks and scene advancement transactions.