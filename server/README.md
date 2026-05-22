# Lyzius API (Fastify + Prisma)

REST backend for the travel itinerary prototype. Matches the SPA `FormData` / `Itinerary` JSON shape (`Itinerary.form` is JSON).

## What you need

- **Node.js 20+** (recommended **22+**)
- **PostgreSQL** and a valid **`DATABASE_URL`** in **`server/.env`** (schema is Postgres-only).

**Quick local DB:** from the **repo root**, run **`docker compose up -d`**. Postgres is exposed on **`localhost:5433`** (not `5432`) so it won’t collide with another Postgres install. Copy **`DATABASE_URL`** from **`server/.env.example`** into **`server/.env`**.

**`P1000` authentication failed (`lyzius`):** usually means Prisma reached **a different Postgres** on **`localhost:5432`** — use **`…@localhost:5433/…`** from **`.env.example`**, or stop the other Postgres service. If **`.env` already lists `5433`** but Prisma still shows **`5432`** in its output, **`$env:DATABASE_URL`** from an earlier PowerShell session was overriding the file; clear it (**`Remove-Item Env:DATABASE_URL`**) or use a fresh terminal (**`override: true`** in **`prisma.config.ts`** fixes this going forward.)

## Setup

From `server/`:

```powershell
copy .env.example .env
```

Edit **`.env`**: **`DATABASE_URL`** (Compose → **`5433`**; managed DBs use whatever port they give you), **`JWT_SECRET`** (32+ chars), **`FRONTEND_ORIGIN`** (often `http://localhost:5173` while the Vite dev server runs separately).

```powershell
npm install
npx prisma migrate deploy
# Optional: npx prisma db seed   (logging only — no demo rows)

npm run dev
```

- Register your first agency: **`POST /v1/auth/register`**, then **`POST /v1/auth/login`**.
- **`npm run dev`** → **http://localhost:3333** (or **`PORT`** in `.env`).

**Health:** `GET /health`

**Reset DB (destructive):** use Postgres tools / `DROP SCHEMA`, or **`npx prisma migrate reset`** (requires dev DB credentials).

---

## Frontend

From **repo root** (runs Vite **and** the API):

```powershell
npm install
npm install --prefix server
npm run dev
```

Frontend only: **`npm run dev:web`** · API only: **`npm run dev:server`**

---

## Auth

| Method | Path               | Notes |
|--------|--------------------|-------|
| POST   | `/v1/auth/register` | `{ organizationName, email, password }` |
| POST   | `/v1/auth/login`    | `{ email, password }` → `{ token, user, organization }` |

Use **`Authorization: Bearer <token>`** on itinerary routes.

## Itineraries (authenticated)

| Method | Path | Notes |
|--------|------|--------|
| GET    | `/v1/itineraries?status=all\|draft\|ready&q=` | Up to 200, newest first |
| GET    | `/v1/itineraries/:id` | |
| POST   | `/v1/itineraries` | Server assigns `id` |
| PATCH  | `/v1/itineraries/:id` | `{}` rejected |
| DELETE | `/v1/itineraries/:id` | `204` |

`lastUpdated` is ISO 8601.

---

## Prisma + `.env`

`prisma.config.ts` loads **`server/.env`**. **SQLite URLs are rejected** (this app targets Postgres).

---

## Next SPA step

Call **`http://localhost:3333`** (or your deployed origin) from React, store JWT, swap in-memory itineraries for **`fetch /v1/itineraries`**.
