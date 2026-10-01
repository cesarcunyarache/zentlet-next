import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GET } from "../route";

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({
  default: { feature: { findMany: vi.fn() }, userFeature: { findMany: vi.fn() } },
}));

const db = vi.mocked(prisma, { deep: true });
const getSession = vi.mocked(auth.api.getSession);
const load = () => GET(new Request("http://localhost/api/account/features"));

beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockResolvedValue({ user: { id: "user-1" } } as never);
});

describe("GET /api/account/features", () => {
  it("sin sesión es 401", async () => {
    getSession.mockResolvedValue(null);
    expect((await load()).status).toBe(401);
    expect(db.feature.findMany).not.toHaveBeenCalled();
  });

  it("devuelve los flags activos para el usuario de la sesión", async () => {
    db.feature.findMany.mockResolvedValue([
      { slug: "global-on", enabled: true, rollout: 100 },
      { slug: "nobody", enabled: true, rollout: 0 },
      { slug: "user-off", enabled: true, rollout: 100 },
      { slug: "user-on", enabled: true, rollout: 0 },
      { slug: "killed", enabled: false, rollout: 100 },
    ] as never);
    db.userFeature.findMany.mockResolvedValue([
      { featureId: "user-off", enabled: false },
      { featureId: "user-on", enabled: true },
      { featureId: "killed", enabled: true },
    ] as never);

    const response = await load();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ enabled: ["global-on", "user-on"] });
    expect(db.userFeature.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1" } }));
  });

  it("un fallo de base de datos es 500", async () => {
    db.feature.findMany.mockRejectedValue(new Error("db down"));
    expect((await load()).status).toBe(500);
  });
});
