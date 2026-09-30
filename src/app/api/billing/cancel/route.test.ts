import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getBillingProvider } from "@/features/billing/providers";
import { subscriptionRow, type TestProvider } from "@/features/billing/server/test-provider";
import { POST } from "./route";

vi.mock("@/features/billing/providers", () =>
  import("@/features/billing/server/test-provider").then((module) => module.mockedProvidersModule()),
);
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({
  default: {
    subscription: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    billingEvent: { create: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

const db = vi.mocked(prisma, { deep: true });
const provider = getBillingProvider() as unknown as TestProvider;
const getSession = vi.mocked(auth.api.getSession);
const TRIAL_END = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

const cancel = () => POST(new Request("http://localhost/api/billing/cancel", { method: "POST" }));
const updateData = () => (db.subscription.update.mock.calls[0][0] as { data: Record<string, unknown> }).data;

beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockResolvedValue({ user: { id: "user-1" } } as never);
  db.$queryRaw.mockResolvedValue([{ count: 1 }] as never);
  db.subscription.findMany.mockResolvedValue([]);
});

describe("POST /api/billing/cancel", () => {
  it("cancelar durante la prueba no cobra y mantiene el acceso hasta que termina", async () => {
    db.subscription.findFirst.mockResolvedValue(
      subscriptionRow({
        status: "trialing",
        trialEndsAt: TRIAL_END,
        currentPeriodEnd: null,
      }) as never,
    );

    expect((await cancel()).status).toBe(200);
    expect(provider.cancelSubscription).toHaveBeenCalledWith("pre-1");
    expect(updateData()).toMatchObject({
      status: "canceled",
      currentPeriodEnd: TRIAL_END,
    });
  });

  it("cancelar una suscripción activa conserva el periodo ya pagado", async () => {
    const periodEnd = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
    db.subscription.findFirst.mockResolvedValue(
      subscriptionRow({
        status: "active",
        currentPeriodEnd: periodEnd,
      }) as never,
    );

    await cancel();

    expect(updateData()).toMatchObject({
      status: "canceled",
      currentPeriodEnd: periodEnd,
    });
  });

  it("cancelar un checkout pendiente lo abandona sin consumir la prueba", async () => {
    db.subscription.findFirst.mockResolvedValue(
      subscriptionRow({ status: "pending", trialEndsAt: TRIAL_END }) as never,
    );

    await cancel();

    expect(updateData()).toMatchObject({
      status: "canceled",
      trialEndsAt: null,
    });
  });

  it("sin suscripción viva es idempotente: 200 y no llama a la pasarela", async () => {
    db.subscription.findFirst.mockResolvedValue(null);

    expect((await cancel()).status).toBe(200);
    expect(provider.cancelSubscription).not.toHaveBeenCalled();
  });

  it("si la pasarela falla no se marca como cancelada", async () => {
    db.subscription.findFirst.mockResolvedValue(subscriptionRow({ status: "active" }) as never);
    provider.cancelSubscription.mockRejectedValue(new Error("timeout"));

    expect((await cancel()).status).toBe(500);
    expect(db.subscription.update).not.toHaveBeenCalled();
  });
});
