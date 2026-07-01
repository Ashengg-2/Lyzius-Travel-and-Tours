# Deploy (Flask — production)

The live app is a **Python Flask** service (`run.py`). Use **Gunicorn** in production — not `python run.py` (dev server only).

---

## 1. Environment variables

| Variable | Example | Required |
|----------|---------|----------|
| **`SECRET_KEY`** | 32+ random chars | **Yes** in production |
| **`PORT`** | `10000` | Render injects this automatically |
| **`DATABASE_URL`** | `sqlite:////data/lyzius.db` | Optional — see **Database** below |

**Remove** if migrating from the old Node stack (no longer used):

- `JWT_SECRET`, `FRONTEND_ORIGIN`, `NODE_ENV`, `SERVE_FRONTEND`
- Linked **Render Postgres** (unless you add Postgres support to Flask later)

---

## 2. Build & start (any host)

**Build:**

```bash
pip install -r requirements.txt
```

**Start (production):**

```bash
gunicorn --bind 0.0.0.0:$PORT run:app
```

On Windows locally for a quick prod smoke test:

```powershell
$env:SECRET_KEY = "change-me"
gunicorn --bind 127.0.0.1:5000 run:app
```

**Local development** (auto-reload, debug):

```bash
python run.py
```

---

## 3. Render (Web Service)

1. **Dashboard → your Web Service → Settings**
2. **Runtime**: **Python 3**
3. **Root directory**: repository root
4. **Build command**:

   ```bash
   pip install -r requirements.txt
   ```

5. **Start command**:

   ```bash
   gunicorn --bind 0.0.0.0:$PORT run:app
   ```

6. **Environment** → add **`SECRET_KEY`** (generate a long random string).
7. **Redeploy**. Open your Render URL → should redirect to **`/itineraries/`**.

### Database on Render

The app defaults to **SQLite** at `instance/lyzius.db`. Render’s default filesystem is **ephemeral** — data is lost on redeploy unless you persist it.

**Option A — Persistent disk (recommended for SQLite)**

1. Web Service → **Disks** → add a disk (e.g. mount path **`/data`**).
2. Set env var:

   ```
   DATABASE_URL=sqlite:////data/lyzius.db
   ```

3. Redeploy.

**Option B — Accept ephemeral storage**

Fine for demos; itineraries/accounting reset when the service restarts or redeploys.

You do **not** need a Render **PostgreSQL** instance for the current Flask app. You can delete/suspend the old Postgres service if it was only for the Node API.

### Migrating from the old Node deploy

| Setting | Old | New |
|---------|-----|-----|
| Runtime | Node | **Python 3** |
| Build | `npm install && … && npm run build` | `pip install -r requirements.txt` |
| Start | `npm start` | `gunicorn --bind 0.0.0.0:$PORT run:app` |

---

## 4. Railway / other PaaS

Same build/start as above. Set **`SECRET_KEY`**. Use a volume + **`DATABASE_URL=sqlite:////path/on/volume/lyzius.db`** if you need persistence.

---

## 5. Smoke test after deploy

- **`/`** → redirects to **`/itineraries/`**
- **`/accounting/`** → accounting workspace
- Create an itinerary → refresh → data should still be there (if persistent disk / DB is configured)

---

## Troubleshooting

- **Module not found / wrong app:** Start command must be `gunicorn … run:app` (repo root, `run.py` present).
- **Data disappears after deploy:** Add a persistent disk and set **`DATABASE_URL`** to a SQLite path on that disk.
- **502 / app won’t start:** Check logs; confirm **`pip install -r requirements.txt`** ran and **`SECRET_KEY`** is set.
- **Old `/health` or `/v1/...` 404:** Those were the Node API; the Flask app does not expose them.

---

## Legacy: Node + Vite + Fastify (`server/`)

The previous stack built **`dist/`** + **`server/dist/`** with `npm run build` / `npm start`, Postgres via Prisma, and env vars `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_ORIGIN`. That code remains in the repo for reference but is **not** the production entry point anymore. See **`server/README.md`** if you need to run the old API locally.
