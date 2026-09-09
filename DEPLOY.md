# SQUADLY Deployment Guide

The app is a single Express process that serves both the API (`/api/v1/*`) and
the built React SPA. SQLite stores all data in one file. This guide covers a
Docker deploy, plus local production-mode notes.

## Local production build

```bash
# 1. Build the frontend
cd frontend && npm ci && npm run build && cd ..

# 2. Run the backend (it serves ./frontend/dist automatically)
cd backend && npm ci --omit=dev
JWT_SECRET="$(node -e 'console.log(require("crypto").randomBytes(48).toString("hex"))')" \
  node src/index.js
# → http://localhost:5000  (SPA + API),  ws://localhost:5000/ws
```

## Docker

```bash
# Build
docker build -t squadly-app .

# Run with a persistent data volume (survives container restarts)
docker run -d --name squadly \
  -p 5000:5000 \
  -e JWT_SECRET="$(node -e 'console.log(require("crypto").randomBytes(48).toString("hex"))')" \
  -v squadly-data:/data \
  squadly-app
```

- The app listens on port **5000** (SPA + API + WebSocket on `/ws`).
- Data persists in the `squadly-data` volume at `/data/squadly.db`.
- **First run:** seed sample data so the app isn't empty:
  ```bash
  docker exec -it squadly node backend/src/db/seed.js
  ```

## Production environment variables

Set these (see `.env.example`):

| Var          | Purpose                                                        |
|--------------|----------------------------------------------------------------|
| `PORT`       | HTTP port (default `5000`)                                     |
| `DB_PATH`    | SQLite file location (Docker: `/data/squadly.db`)              |
| `JWT_SECRET` | **Required** — signing secret, long random value               |
| `FRONTEND_URL` | CORS allowed origin (only matters when the SPA is served elsewhere) |

## Notes / production integration points

- **Payments are mock adapters.** The wallet topup/pay endpoints accept any
  `payment_method` (e.g. `mada`, `wallet`) without a real gateway. Wire real
  Mada/Apple Pay before taking real money.
- **Single-node SQLite** is fine for a small footprint but is not horizontally
  scalable. Move to Postgres if you need concurrent writes at scale.
- Add a reverse proxy (nginx/Caddy) for TLS if you expose it directly to the
  internet.
