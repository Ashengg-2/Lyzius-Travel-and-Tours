import type { FastifyReply, FastifyRequest } from "fastify";
import type { Env } from "../env.js";
import { verifyToken } from "./jwt.js";

/** Returns false if unauthorized (reply already sent). */
export async function authenticate(
  env: Env,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    await reply.code(401).send({ error: "Missing bearer token" });
    return false;
  }
  const token = header.slice("Bearer ".length).trim();
  const payload = verifyToken(env, token);
  if (!payload) {
    await reply.code(401).send({ error: "Invalid or expired token" });
    return false;
  }
  request.auth = payload;
  return true;
}
