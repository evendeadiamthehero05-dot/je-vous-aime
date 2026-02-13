# Backend

Express API for Je vous aime shared room mutations.

## Run
1. `copy .env.example .env`
2. Configure Firebase Admin credentials.
3. `npm install`
4. `npm run dev`

## Endpoints
- `GET /health`
- `GET /rooms/:roomId/exists`
- `POST /rooms/create`
- `POST /rooms/join`
- `POST /rooms/continue`
- `POST /rooms/role`
- `POST /rooms/scene-data`
- `POST /rooms/ready`
- `POST /rooms/presence`
- `POST /rooms/advance`