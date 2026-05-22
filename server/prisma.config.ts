import { config as loadDotenv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const serverRoot = dirname(fileURLToPath(import.meta.url));

// With prisma.config.ts present, Prisma CLI does not auto-load `.env`.
// `override: true` makes `server/.env` win over a stale `DATABASE_URL` left in PowerShell/session env.
loadDotenv({ path: resolve(serverRoot, ".env"), override: true });
const dbUrl = process.env.DATABASE_URL?.trim() ?? "";

/** Repo Compose maps Docker Postgres to host :5433; :5432 is often a native Windows Postgres install → P1000. */
const usesComposeUserOn5432 =
  /\bpostgresql:\/\/lyzius:[^@]+@(localhost|127\.0\.0\.1):5432\/lyzius\b/i.test(
    dbUrl
  );
if (usesComposeUserOn5432) {
  console.warn(`
[server/prisma.config.ts] DATABASE_URL uses lyzius@localhost:5432.
This repo's docker-compose.yml exposes Postgres on host port 5433 (see server/.env.example).
If migrate fails with P1000, change the port to 5433 or point at your real Postgres user/password.
`);
}

if (dbUrl.startsWith("file:")) {
  console.error(`
[server/prisma.config.ts] This project uses PostgreSQL. DATABASE_URL cannot be a SQLite file URL.
Use a Postgres URL from Render / Neon / Docker (see server/.env.example).
`);
  process.exit(1);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
