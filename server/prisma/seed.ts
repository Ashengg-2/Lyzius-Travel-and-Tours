import { config as loadEnvFile } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Load `server/.env` if present (for consistency with other prisma scripts). */
const serverDir = dirname(dirname(fileURLToPath(import.meta.url)));
loadEnvFile({ path: join(serverDir, ".env") });

async function main() {
  console.log(
    "db seed: no demo rows (create an org + user via POST /v1/auth/register).",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
