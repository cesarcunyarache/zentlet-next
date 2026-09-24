import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { POST } from "./route";

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({ default: { user: { updateMany: vi.fn() }, $queryRaw: vi.fn() } }));

const db = vi.mocked(prisma, { deep: true });
const getSession = vi.mocked(auth.api.getSession);
const complete = () => POST(new Request("http://localhost/api/account/onboarding", { method: "POST" }));

beforeEach(() => {
  vi.resetAllMocks();
  db.$queryRaw.mockResolvedValue([{ count: 1 }] as never);
  db.user.updateMany.mockResolvedValue({ count: 1 });
});

describe("POST /api/account/onboarding", () => {
  it("sin sesión es 401 y no marca nada", async () => {
    getSession.mockResolvedValue(null);
    expect((await complete()).status).toBe(401);
    expect(db.user.updateMany).not.toHaveBeenCalled();
  });

  it("marca el recorrido como visto sólo si aún no lo estaba (conserva la primera fecha)", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } } as never);
    expect((await complete()).status).toBe(204);
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", onboardingCompletedAt: null },
      data: { onboardingCompletedAt: expect.any(Date) },
    });
  });

  it("repetirlo no falla (idempotente)", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } } as never);
    db.user.updateMany.mockResolvedValue({ count: 0 });
    expect((await complete()).status).toBe(204);
  });
});
