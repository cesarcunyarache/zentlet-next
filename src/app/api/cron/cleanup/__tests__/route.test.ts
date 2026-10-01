import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { GET } from "./route";

/*
 * Limpieza diaria: sólo la ejecuta Vercel Cron con `CRON_SECRET` y sólo
 * borra lo vencido.
 */

vi.mock("@/lib/prisma", () => ({
  default: {
    usageLimit: { deleteMany: vi.fn() },
    rateLimit: { deleteMany: vi.fn() },
    session: { deleteMany: vi.fn() },
    verification: { deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn() },
    user: { count: vi.fn() },
  },
}));

const db = vi.mocked(prisma, { deep: true });
const SECRET = "cron-secret-for-tests";

const get = (authorization?: string) =>
  GET(new Request("http://localhost/api/cron/cleanup", { headers: authorization ? { authorization } : {} }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ now: new Date("2026-09-29T09:00:00.000Z"), toFake: ["Date"] });
  vi.stubEnv("CRON_SECRET", SECRET);
  for (const model of [db.usageLimit, db.rateLimit, db.session, db.verification, db.notification]) {
    model.deleteMany.mockResolvedValue({ count: 2 } as never);
  }
  db.user.count.mockResolvedValue(0 as never);
});

describe("GET /api/cron/cleanup", () => {
  it("sin el secreto (o sin CRON_SECRET configurado) no borra nada", async () => {
    expect((await get()).status).toBe(401);
    expect((await get("Bearer otro")).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await get("Bearer ")).status).toBe(401);
    expect(db.session.deleteMany).not.toHaveBeenCalled();
  });

  it("borra sólo lo vencido y devuelve cuánto", async () => {
    const response = await get(`Bearer ${SECRET}`);

    expect(response.status).toBe(200);
    expect((await response.json()).deleted).toEqual({
      usageLimits: 2,
      authRateLimits: 2,
      sessions: 2,
      verifications: 2,
      notifications: 2,
    });

    const now = new Date("2026-09-29T09:00:00.000Z");
    const dayAgo = new Date("2026-09-28T09:00:00.000Z");
    expect(db.usageLimit.deleteMany).toHaveBeenCalledWith({ where: { windowStart: { lt: dayAgo } } });
    expect(db.rateLimit.deleteMany).toHaveBeenCalledWith({ where: { lastRequest: { lt: BigInt(dayAgo.getTime()) } } });
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: now } } });
    expect(db.verification.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: now } } });
    expect(db.notification.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date("2026-07-01T09:00:00.000Z") } },
    });
  });
});
