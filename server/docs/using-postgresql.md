# Optional: Postgres via Docker (local)

The app expects **PostgreSQL** (`DATABASE_URL`). If you prefer not to install Postgres on Windows directly, Docker is enough.

From the **repo root**:

```powershell
docker compose up -d
```

Use in **`server/.env`**:

```env
DATABASE_URL="postgresql://lyzius:lyzius@localhost:5433/lyzius"
```

The compose file maps **host port `5433` → Postgres `5432`** so **`localhost:5432` still works for a separate Postgres you may already have installed. If Prisma reports **P1000** (authentication failed for `lyzius`) while using port `5432`, you’re probably hitting **that local server**, not the container — switch the URL to port **`5433`** (see **`server/.env.example`**).

Then from **`server/`**:

```powershell
npx prisma migrate deploy
```

To use **managed Postgres** (Render, Neon, etc.) instead, put that connection string in **`DATABASE_URL`**; no compose step required.
