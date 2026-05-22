# Deploy (single service: API + SPA)

Your repo builds **two artifacts**, but production can run **one Node process**:

1. **`dist/`** (repo root) — Vite production build (`npm run build` at root includes this).
2. **`server/dist/`** — compiled Fastify app.

When **`NODE_ENV=production`** and **`dist/index.html`** exists, the server also **serves the SPA** from `/` and `/assets/*`; APIs stay under **`/v1/**`**.

To **disable** that (split hosting), set **`SERVE_FRONTEND=false`**.

---

## 1. Environment variables (`server`/host dashboard)

Copy from **`server/.env.example`** and set on the host:

| Variable | Example | Notes |
|----------|---------|--------|
| **`NODE_ENV`** | `production` | Required for serving `dist/` (many hosts set automatically). |
| **`PORT`** | `3333` or host default | Railway/Render inject `PORT`; listen uses it. |
| **`DATABASE_URL`** | `postgresql://…` | **Postgres** from Render (linked DB), Neon, or Docker — see **`server/.env.example`**. |
| **`JWT_SECRET`** | 32+ random chars | Rotate if leaked. |
| **`FRONTEND_ORIGIN`** | `https://your-app.up.railway.app` | Same public URL as the browser tab if everything is one service; comma‑separate if you add extra origins. |

**Database**

The Prisma schema is **PostgreSQL-only**. On Render, create a **PostgreSQL** instance and **link** it to the Web Service so **`DATABASE_URL`** is injected (or paste the **External Database URL** into env vars, usually with **`?sslmode=require`**).

---

## 2. Install & build (from repo root on the builder)

Hosts usually run equivalent of:

```bash
npm install
npm install --prefix server
npm run build
```

- **`npm run build`** runs `vite build` then `npm run build --prefix server` (`prisma generate` + `tsc`).
- **`npm start`** runs `npm run start --prefix server` → `prisma migrate deploy && node server/dist/index.js`.

---

## 3. Railway (simple)

1. New **Project** → **Deploy from GitHub** (or upload repo).
2. **Root directory**: repository root (`Create new component` folder).
3. **Build command**:  

   ```bash
   npm install && npm install --prefix server && npm run build
   ```

4. **Start command**:  

   ```bash
   npm start
   ```

5. Add **`JWT_SECRET`** and **`DATABASE_URL`** (Neon Postgres URL recommended).
6. Set **`NODE_ENV`** to `production` if not defaulted.
7. **`FRONTEND_ORIGIN`** = your Railway **public HTTPS URL** for this service (same as where you open the app).
8. Redeploy. Open **`/health`** → `{"ok":true}` ; open **`/`** → SPA.

(Optional) Add a **Volume** only if you later change the stack to use on-disk files — not needed for Postgres.

---

## 4. Render (Web Service)

Same idea:

- **Build**: `npm install && npm install --prefix server && npm run build`
- **Start**: `npm start`
- **Env vars** same as Railway.
- Attach **PostgreSQL** or use Neon + **`DATABASE_URL`**.

---

## 5. Smoke test locally (optional)

From repo root, after **`npm run build`**:

```bash
cd server
set NODE_ENV=production   # Windows PowerShell: $env:NODE_ENV='production'
npm start
```

Visit `http://127.0.0.1:3333/` (adjust `PORT` / `.env`). You should see the app and **`GET /health`**.

---

## 6. What’s left for “real” use

The React app still loads data **from in-memory state** unless you wired **`fetch`** to **`/v1/itineraries`**. For deployment, finish that + store the JWT once you expose auth in the UI.

---

## Troubleshooting

- **Blank page / 404 on `/`:** Confirm **`NODE_ENV=production`**, **`npm run build` ran from repo root** (there is a **`dist/index.html`** next to **`server/`**), **`SERVE_FRONTEND` ≠ `false`**.
- **CORS errors:** **`FRONTEND_ORIGIN`** must match the browser origin (scheme + host + port).
- **Prisma migrations fail:** `DATABASE_URL` wrong or Postgres schema not migrated; see **`server/docs/using-postgresql.md`**.
