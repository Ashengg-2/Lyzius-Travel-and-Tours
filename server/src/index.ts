import "dotenv/config";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { loadEnv } from "./env.js";
import { authPlugin } from "./routes/auth.js";
import { itinerariesPlugin } from "./routes/itineraries.js";

const env = loadEnv(process.env);

const origins = env.FRONTEND_ORIGIN.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const app = Fastify({
  logger: true,
  trustProxy: true,
});

await app.register(cors, {
  origin: origins.length ? origins : true,
  credentials: true,
});

await app.register(rateLimit, {
  global: true,
  max: 400,
  timeWindow: "1 minute",
});

app.get("/health", async () => ({ ok: true }));

await app.register(authPlugin(env), {
  prefix: "/v1/auth",
});

await app.register(itinerariesPlugin(env), {
  prefix: "/v1/itineraries",
});

/** Vite output at repo `<root>/dist` when compiled from `<root>/server/dist/index.js`. */
const __dirname = dirname(fileURLToPath(import.meta.url));
const viteDistDir = join(__dirname, "..", "..", "dist");
const shouldServeFrontend =
  process.env.SERVE_FRONTEND !== "false" &&
  process.env.NODE_ENV === "production" &&
  existsSync(join(viteDistDir, "index.html"));

if (shouldServeFrontend) {
  await app.register(fastifyStatic, {
    root: viteDistDir,
    index: ["index.html"],
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return reply.code(404).send({ error: "Not found" });
    }
    const pathOnly = request.url.split("?", 2)[0] ?? request.url;
    if (
      pathOnly.startsWith("/v1") ||
      pathOnly.startsWith("/health")
    ) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.sendFile("index.html");
  });
}

const address = await app.listen({
  port: env.PORT,
  host: "0.0.0.0",
});

app.log.info(`Listening on ${address}`);
