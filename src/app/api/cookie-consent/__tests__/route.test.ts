import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { POST } from "../route";
import { POST as SYNC } from "../sync/route";

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({
  default: {
    userCookieConsent: { create: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

const db = vi.mocked(prisma, { deep: true });
const getSession = vi.mocked(auth.api.getSession);

const VISITOR = "6f1c2a7e-9b3d-4c5e-8f60-718293a4b5c6";
const body = { visitorId: VISITOR, granted: ["analytics"], policyVersion: "2026-09-26", source: "banner" };
const row = {
  ...body,
  id: "consent-1",
  userId: null,
  userAgent: null,
  createdAt: new Date("2026-10-16T12:00:00Z"),
};

const request = (url: string, payload: unknown, headers: Record<string, string> = {}) =>
  new Request(url, { method: "POST", body: JSON.stringify(payload), headers });
const post = (payload: unknown = body, headers?: Record<string, string>) =>
  POST(request("http://localhost/api/cookie-consent", payload, headers));
const sync = (payload: unknown = { visitorId: VISITOR }) =>
  SYNC(request("http://localhost/api/cookie-consent/sync", payload));

beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockResolvedValue(null);
  db.$queryRaw.mockResolvedValue([{ count: 1 }] as never);
  db.userCookieConsent.create.mockResolvedValue(row as never);
  db.userCookieConsent.updateMany.mockResolvedValue({ count: 0 });
});

describe("POST /api/cookie-consent", () => {
  it("sin sesión guarda la respuesta del visitante con su user agent", async () => {
    const response = await post(body, { "user-agent": "Safari" });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "consent-1" });
    expect(db.userCookieConsent.create).toHaveBeenCalledWith({
      data: { ...body, userId: null, userAgent: "Safari" },
    });
    expect(db.userCookieConsent.updateMany).not.toHaveBeenCalled();
  });

  it("con sesión la asocia a la cuenta y reclama las respuestas anónimas del dispositivo", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } } as never);

    expect((await post()).status).toBe(201);
    expect(db.userCookieConsent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-1" }),
    });
    expect(db.userCookieConsent.updateMany).toHaveBeenCalledWith({
      where: { visitorId: VISITOR, userId: null },
      data: { userId: "user-1" },
    });
  });

  it("un rechazo es una lista vacía y se guarda igual", async () => {
    expect((await post({ ...body, granted: [] })).status).toBe(201);
    expect(db.userCookieConsent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ granted: [] }) });
  });

  it.each([
    ["categoría desconocida", { ...body, granted: ["marketing"] }],
    ["visitante que no es uuid", { ...body, visitorId: "abc" }],
    ["versión con otro formato", { ...body, policyVersion: "v2" }],
    ["origen desconocido", { ...body, source: "api" }],
  ])("%s es 422", async (_, payload) => {
    expect((await post(payload)).status).toBe(422);
    expect(db.userCookieConsent.create).not.toHaveBeenCalled();
  });

  it("limita por IP y responde 429 al pasarse del cupo", async () => {
    db.$queryRaw.mockResolvedValue([{ count: 31 }] as never);
    const response = await post(body, { "x-forwarded-for": "203.0.113.7, 10.0.0.1" });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("3600");
    expect(JSON.stringify(db.$queryRaw.mock.calls[0])).toContain("cookie-consent:203.0.113.7");
    expect(db.userCookieConsent.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/cookie-consent/sync", () => {
  it("sin sesión es 401", async () => {
    expect((await sync()).status).toBe(401);
    expect(db.userCookieConsent.updateMany).not.toHaveBeenCalled();
  });

  it("reclama el dispositivo y devuelve la última respuesta de la cuenta", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } } as never);
    db.userCookieConsent.findFirst.mockResolvedValue({ ...row, userId: "user-1", granted: [] } as never);

    const response = await sync();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      granted: [],
      policyVersion: "2026-09-26",
      createdAt: "2026-10-16T12:00:00.000Z",
    });
    expect(db.userCookieConsent.updateMany).toHaveBeenCalledWith({
      where: { visitorId: VISITOR, userId: null },
      data: { userId: "user-1" },
    });
    expect(db.userCookieConsent.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("sin respuestas previas devuelve null", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } } as never);
    db.userCookieConsent.findFirst.mockResolvedValue(null);

    const response = await sync();
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });
});
