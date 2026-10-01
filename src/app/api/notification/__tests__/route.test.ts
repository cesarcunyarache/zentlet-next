import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { POST } from "./read/route";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({
  default: {
    notification: { findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

const db = vi.mocked(prisma, { deep: true });
const getSession = vi.mocked(auth.api.getSession);

const signIn = (userId: string | null) =>
  getSession.mockResolvedValue((userId ? { user: { id: userId } } : null) as never);

const row = {
  id: "n1",
  type: "budget.exceeded",
  data: { budgetId: "b1", categoryName: "Comida", currency: "PEN", spent: 1100, limit: 1000, periodFrom: "2026-09-01" },
  readAt: null,
  createdAt: new Date("2026-09-30T12:00:00.000Z"),
};

beforeEach(() => {
  vi.resetAllMocks();
  signIn("user-1");
  db.notification.findMany.mockResolvedValue([row] as never);
  db.notification.count.mockResolvedValue(1);
  db.$queryRaw.mockResolvedValue([{ count: 1 }] as never);
});

describe("GET /api/notification", () => {
  it("returns only the session user's notifications with the unread count", async () => {
    const response = await GET(new Request("http://localhost/api/notification"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [{ ...row, createdAt: "2026-09-30T12:00:00.000Z" }],
      unreadCount: 1,
    });
    expect(db.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1" } }));
    expect(db.notification.count).toHaveBeenCalledWith({ where: { userId: "user-1", readAt: null } });
  });

  it("requires a session", async () => {
    signIn(null);
    expect((await GET(new Request("http://localhost/api/notification"))).status).toBe(401);
    expect(db.notification.findMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/notification/read", () => {
  it("marks only the session user's unread notifications", async () => {
    const response = await POST(new Request("http://localhost/api/notification/read", { method: "POST" }));

    expect(response.status).toBe(204);
    expect(db.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});
