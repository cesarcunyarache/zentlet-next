import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { getEffectivePlan } from "../subscriptions";

vi.mock("@/lib/prisma", () => ({ default: { subscription: { findMany: vi.fn() } } }));

const findMany = vi.mocked(prisma.subscription.findMany);

beforeEach(() => findMany.mockResolvedValue([]));
afterEach(() => vi.unstubAllEnvs());

describe("BILLING_GRANT_PRO", () => {
  it("sin la variable, un usuario sin suscripción es free", async () => {
    vi.stubEnv("BILLING_GRANT_PRO", "");
    expect(await getEffectivePlan("u1")).toBe("free");
  });

  it("fuera de producción da Pro a todos", async () => {
    vi.stubEnv("BILLING_GRANT_PRO", "true");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(await getEffectivePlan("u1")).toBe("pro");
  });

  it("en producción se ignora", async () => {
    vi.stubEnv("BILLING_GRANT_PRO", "true");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(await getEffectivePlan("u1")).toBe("free");
  });
});
