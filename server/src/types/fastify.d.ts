import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    auth?: {
      userId: string;
      organizationId: string;
    };
  }
}
