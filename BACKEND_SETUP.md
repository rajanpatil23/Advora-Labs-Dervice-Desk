# Backend Setup Guide (for the local AI agent)

This frontend ships **fully working with mock data**. To plug in a real backend:

## 1. Read the contract

Implement the REST endpoints described in [`API_CONTRACT.md`](./API_CONTRACT.md).
TypeScript shapes for every entity live in [`src/lib/types.ts`](./src/lib/types.ts) — treat
those as the canonical schema and mirror them in your database.

## 2. Required endpoints (MVP)

To replace the mock auth, these are the only endpoints required for the frontend to
work end-to-end against your backend:

- `POST /auth/login`
- `POST /auth/signup`
- `POST /auth/logout`
- `GET  /auth/me`
- `GET  /auth/memberships`
- `GET  /health`

The other endpoints (tickets, incidents, etc.) can be added incrementally — until
they exist, the frontend will continue using the in-memory store and fall back to the
mock layer for unknown routes.

## 3. Point the frontend at it

Set the env var:

```
VITE_API_BASE_URL=https://your-backend.example.com
```

Restart `vite` / rebuild. That's it — no code changes needed in the frontend.

## 4. Fallback behaviour

The client (`src/lib/api/client.ts`) does this:

- **Empty `VITE_API_BASE_URL`** → all calls go to the in-browser mock. App fully usable offline.
- **Set `VITE_API_BASE_URL`** → calls go to your backend.
  - On `4xx` responses → error is surfaced to the user (e.g. wrong password).
  - On network errors / `5xx` / unreachable backend → silently falls back to mock so the demo never breaks.

## 5. Suggested backend stack

Anything that can serve JSON over HTTP works. Recommended:

- **Node + Fastify/Express + Prisma + Postgres** (matches our types directly)
- **FastAPI + SQLAlchemy + Postgres**
- **Hono + Drizzle + Postgres** (edge-friendly)

Auth: JWT bearer tokens. The frontend stores the token in `localStorage` under
`connecttly.auth.token`.

## 6. Seed data

The mock uses 5 demo users (password = `demo`):

| Email                   | Role      |
|-------------------------|-----------|
| admin@demo.com          | admin     |
| manager@demo.com        | manager   |
| agent@demo.com          | agent     |
| resolver@demo.com       | resolver  |
| requester@demo.com      | requester |

Mirror these in your database for a smooth handoff.

## 7. CORS

Allow the frontend origin in your backend CORS config. For local dev that's
`http://localhost:5173`; for production, your deployed URL.
