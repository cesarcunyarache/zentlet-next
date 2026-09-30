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
    user: { findUnique: vi.fn() },
    subscription: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    billingEvent: { create: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

const db = vi.mocked(prisma, { deep: true });
const provider = getBillingProvider() as unknown as TestProvider;
const getSession = vi.mocked(auth.api.getSession);
const DAY_MS = 24 * 60 * 60 * 1000;
const CHECKOUT_URL = "https://www.mercadopago.com.pe/subscriptions/checkout?preapproval_id=pre-1";
const uniqueViolation = Object.assign(new Error("Unique constraint failed"), {
  code: "P2002",
});

const checkout = (body: unknown = { planKey: "pro" }) =>
  POST(
    new Request("http://localhost/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockResolvedValue({ user: { id: "user-1" } } as never);
  db.$queryRaw.mockResolvedValue([{ count: 1 }] as never);
  db.user.findUnique.mockResolvedValue({ email: "ana@example.com" } as never);
  db.subscription.findMany.mockResolvedValue([]);
  db.subscription.create.mockImplementation((({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(subscriptionRow({ ...data, id: "sub-new", externalId: null }))) as never);
  provider.createCheckout.mockResolvedValue({
    externalId: "pre-1",
    checkoutUrl: CHECKOUT_URL,
  });
});

describe("POST /api/billing/checkout", () => {
  it("sin sesión es 401", async () => {
    getSession.mockResolvedValue(null as never);
    expect((await checkout()).status).toBe(401);
  });

  it("primer checkout: suscripción pending con 15 días de prueba y precio del servidor", async () => {
    const res = await checkout({ planKey: "pro", amount: 1 });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ redirectUrl: CHECKOUT_URL });
    const { data } = db.subscription.create.mock.calls[0][0] as {
      data: { amount: number; status: string; trialEndsAt: Date };
    };
    expect(data).toMatchObject({
      status: "pending",
      amount: 1490,
      currency: "PEN",
      planKey: "pro",
    });
    expect(data.trialEndsAt.getTime() - Date.now()).toBeGreaterThan(14 * DAY_MS);
    expect(provider.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: "sub-new",
        payerEmail: "ana@example.com",
        firstChargeAt: data.trialEndsAt,
      }),
    );
    expect(db.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-new" },
      data: { externalId: "pre-1", checkoutUrl: CHECKOUT_URL },
    });
  });

  it("quien ya usó la prueba paga desde hoy", async () => {
    db.subscription.findMany.mockResolvedValue([
      subscriptionRow({
        status: "canceled",
        trialEndsAt: new Date("2026-01-15"),
        currentPeriodEnd: new Date("2026-02-15"),
      }),
    ] as never);

    await checkout();

    const { data } = db.subscription.create.mock.calls[0][0] as {
      data: { trialEndsAt: Date | null };
    };
    expect(data.trialEndsAt).toBeNull();
  });

  it("con una suscripción activa es 409 y no crea otra", async () => {
    db.subscription.findMany.mockResolvedValue([subscriptionRow({ status: "active" })] as never);

    expect((await checkout()).status).toBe(409);
    expect(db.subscription.create).not.toHaveBeenCalled();
  });

  it("doble clic: reutiliza el checkout pendiente reciente", async () => {
    db.subscription.findMany.mockResolvedValue([
      subscriptionRow({ status: "pending", checkoutUrl: CHECKOUT_URL }),
    ] as never);

    const res = await checkout();

    expect(await res.json()).toEqual({ redirectUrl: CHECKOUT_URL });
    expect(provider.createCheckout).not.toHaveBeenCalled();
  });

  it("un checkout todavía creándose es 409", async () => {
    db.subscription.findMany.mockResolvedValue([subscriptionRow({ status: "pending", checkoutUrl: null })] as never);
    expect((await checkout()).status).toBe(409);
  });

  it("dos altas simultáneas: el índice único frena la segunda con 409", async () => {
    db.subscription.create.mockRejectedValue(uniqueViolation);
    expect((await checkout()).status).toBe(409);
    expect(provider.createCheckout).not.toHaveBeenCalled();
  });

  it("si la pasarela falla, la suscripción se abandona para poder reintentar", async () => {
    provider.createCheckout.mockRejectedValue(new Error("timeout"));

    expect((await checkout()).status).toBe(500);
    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-new" },
        data: expect.objectContaining({ status: "canceled" }),
      }),
    );
  });

  it("un plan que no es de pago es 422", async () => {
    expect((await checkout({ planKey: "free" })).status).toBe(422);
  });
});
