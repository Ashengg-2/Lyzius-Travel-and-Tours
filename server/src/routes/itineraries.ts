import type { Env } from "../env.js";
import { authenticate } from "../lib/guard.js";
import { prisma } from "../lib/prisma.js";
import {
  CreateItinerarySchema,
  PatchItinerarySchema,
  QueryListSchema,
} from "../schemas/domain.js";
import type { Itinerary } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const IdParamSchema = z.object({
  id: z.string().min(1).max(64),
});

function serializeItinerary(row: Itinerary) {
  return {
    id: row.id,
    title: row.title,
    client: row.client,
    destination: row.destination,
    travelStart: row.travelStart,
    travelEnd: row.travelEnd,
    status: row.status as "draft" | "ready",
    lastUpdated: row.lastUpdated.toISOString(),
    form: row.form,
  };
}

export function itinerariesPlugin(env: Env): FastifyPluginAsync {
  return async (fastify) => {
    fastify.addHook("preHandler", async (request, reply) => {
      const ok = await authenticate(env, request, reply);
      if (!ok) return;
    });

    fastify.get("/", async (request, reply) => {
      const qp = QueryListSchema.safeParse({
        status: (request.query as Record<string, string>).status ?? "all",
        q: (request.query as Record<string, string>).q,
      });
      if (!qp.success) {
        return reply
          .status(400)
          .send({
            error: "Invalid query",
            issues: qp.error.flatten(),
          });
      }

      const { status, q } = qp.data;
      const orgId = request.auth!.organizationId;

      const where: Prisma.ItineraryWhereInput = {
        organizationId: orgId,
      };

      if (status !== "all") {
        where.status = status;
      }

      if (q?.trim()) {
        const needle = q.trim();
        where.OR = [
          { client: { contains: needle, mode: "insensitive" } },
          { destination: { contains: needle, mode: "insensitive" } },
          { title: { contains: needle, mode: "insensitive" } },
          { travelStart: { contains: needle, mode: "insensitive" } },
        ];
      }

      const rows = await prisma.itinerary.findMany({
        where,
        orderBy: { lastUpdated: "desc" },
        take: 200,
      });

      return reply.send(rows.map(serializeItinerary));
    });

    fastify.get("/:id", async (request, reply) => {
      const params = IdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: "Invalid id" });
      }

      const row = await prisma.itinerary.findFirst({
        where: {
          id: params.data.id,
          organizationId: request.auth!.organizationId,
        },
      });
      if (!row) {
        return reply.status(404).send({ error: "Itinerary not found" });
      }
      return reply.send(serializeItinerary(row));
    });

    fastify.post("/", async (request, reply) => {
      const parsed = CreateItinerarySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({
            error: "Invalid body",
            issues: parsed.error.flatten(),
          });
      }
      const body = parsed.data;

      const row = await prisma.itinerary.create({
        data: {
          organizationId: request.auth!.organizationId,
          title: body.title,
          client: body.client,
          destination: body.destination,
          travelStart: body.travelStart,
          travelEnd: body.travelEnd,
          status: body.status,
          form: body.form as Prisma.InputJsonValue,
        },
      });

      return reply.status(201).send(serializeItinerary(row));
    });

    fastify.patch("/:id", async (request, reply) => {
      const params = IdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: "Invalid id" });
      }

      const parsed = PatchItinerarySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({
            error: "Invalid body",
            issues: parsed.error.flatten(),
          });
      }
      const body = parsed.data;

      if (Object.keys(body).length === 0) {
        return reply
          .status(400)
          .send({ error: "At least one field is required for PATCH" });
      }

      const existing = await prisma.itinerary.findFirst({
        where: {
          id: params.data.id,
          organizationId: request.auth!.organizationId,
        },
      });
      if (!existing) {
        return reply.status(404).send({ error: "Itinerary not found" });
      }

      const data: Prisma.ItineraryUpdateInput = {};
      if (body.title !== undefined) data.title = body.title;
      if (body.client !== undefined) data.client = body.client;
      if (body.destination !== undefined) {
        data.destination = body.destination;
      }
      if (body.travelStart !== undefined) {
        data.travelStart = body.travelStart;
      }
      if (body.travelEnd !== undefined) {
        data.travelEnd = body.travelEnd;
      }
      if (body.status !== undefined) data.status = body.status;
      if (body.form !== undefined) {
        data.form = body.form as Prisma.InputJsonValue;
      }

      const row = await prisma.itinerary.update({
        where: { id: params.data.id },
        data,
      });

      return reply.send(serializeItinerary(row));
    });

    fastify.delete("/:id", async (request, reply) => {
      const params = IdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: "Invalid id" });
      }

      const result = await prisma.itinerary.deleteMany({
        where: {
          id: params.data.id,
          organizationId: request.auth!.organizationId,
        },
      });

      if (result.count === 0) {
        return reply.status(404).send({ error: "Itinerary not found" });
      }

      return reply.code(204).send();
    });
  };
}
