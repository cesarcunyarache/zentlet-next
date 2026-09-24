import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { logger } from "./observability/logger";

/** Umbral a partir del cual una query se registra como lenta. */
const SLOW_QUERY_MS = 500;

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const client = new PrismaClient({
    adapter,
    log: [{ emit: "event", level: "query" }],
  });
  // sólo el SQL parametrizado: los valores (importes, descripciones) no salen
  client.$on("query", (event) => {
    if (event.duration < SLOW_QUERY_MS) return;
    logger.warn({ durationMs: event.duration, query: event.query.slice(0, 1000) }, "db.slow_query");
  });
  return client;
}

const globalForPrisma = global as unknown as {
  prisma: ReturnType<typeof createPrismaClient>;
};
const prisma = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
