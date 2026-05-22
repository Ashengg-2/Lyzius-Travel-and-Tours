import type { Env } from "../env.js";
import { hashPassword, verifyPassword } from "../lib/auth.js";
import { signToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const RegisterSchema = z
  .object({
    organizationName: z.string().min(2).max(200),
    email: z.string().email().max(320),
    password: z.string().min(8).max(200),
  })
  .strict();

const LoginSchema = z
  .object({
    email: z.string().email().max(320),
    password: z.string().min(8).max(200),
  })
  .strict();

export function authPlugin(env: Env): FastifyPluginAsync {
  return async (fastify) => {
    fastify.post("/register", async (request, reply) => {
      const parsed = RegisterSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "Invalid body", issues: parsed.error.flatten() });
      }
      const { organizationName, email, password } = parsed.data;

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        return reply.status(409).send({ error: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);

      const created = await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: { name: organizationName },
        });
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            organizationId: organization.id,
          },
        });
        return { organization, user };
      });

      const token = signToken(env, {
        userId: created.user.id,
        organizationId: created.organization.id,
      });

      return reply.status(201).send({
        token,
        user: { id: created.user.id, email: created.user.email },
        organization: {
          id: created.organization.id,
          name: created.organization.name,
        },
      });
    });

    fastify.post("/login", async (request, reply) => {
      const parsed = LoginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "Invalid body", issues: parsed.error.flatten() });
      }
      const { email, password } = parsed.data;

      const row = await prisma.user.findUnique({
        where: { email },
        include: { organization: true },
      });
      if (
        !row ||
        !(await verifyPassword(password, row.passwordHash))
      ) {
        return reply
          .status(401)
          .send({ error: "Invalid email or password" });
      }

      const token = signToken(env, {
        userId: row.id,
        organizationId: row.organizationId,
      });

      return reply.send({
        token,
        user: { id: row.id, email: row.email },
        organization: {
          id: row.organization.id,
          name: row.organization.name,
        },
      });
    });
  };
}
