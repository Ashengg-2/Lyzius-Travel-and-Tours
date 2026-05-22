
# Create new component

This is a code bundle for Create new component. The original project is available at https://www.figma.com/design/HBNW5S1Xy850rDnhokVqTO/Create-new-component.

## Run web + API from one terminal

From the **repo root**:

```powershell
npm install          # installs root deps including concurrently — also npm install inside server once
cd server && npm install && cd ..
npm run dev
```

This starts:

- **`web`** — Vite (usually http://localhost:5173)
- **`api`** — Fastify (`server/`, usually http://127.0.0.1:3333)

Stop both with **Ctrl+C** once.

First-time API setup: start **Postgres** (easiest: **`docker compose up -d`** from repo root), copy **`server\.env.example`** → **`server\.env`**, edit **`JWT_SECRET`** and confirm **`DATABASE_URL`**, then from **`server/`** run **`npx prisma migrate deploy`** (seed is optional/no-op — see **`server/README.md`**). Register your first agency with **`POST /v1/auth/register`** before calling itinerary APIs.

**Only frontend:** `npm run dev:web`  
**Only API:** `npm run dev:server` (same as `npm run dev:api`)

**Production build:** `npm install && npm install --prefix server && npm run build` then **`NODE_ENV=production npm start`** (see **[DEPLOY.md](./DEPLOY.md)**).

---

## Deployment

Single-service hosting (recommended): **[DEPLOY.md](./DEPLOY.md)** — Render / Railway, **Postgres** + env vars.

---

## Backend

**PostgreSQL** is required (Render **free Postgres**, Docker via **`docker compose`**, or Neon). See **[`server/README.md`](./server/README.md)** and **[`server/docs/using-postgresql.md`](./server/docs/using-postgresql.md)**.

---
