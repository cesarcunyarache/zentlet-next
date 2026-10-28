import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { getBillingProvider } from "@/features/billing/providers";
import { subscriptionRow, type TestProvider } from "@/features/billing/__tests__/test-provider";
import { POST } from "../route";

vi.mock("@/features/billing/providers", () =>
  import("@/features/billing/__tests__/test-provider").then((module) => module.mockedProvidersModule()),
);
vi.mock("@/lib/prisma", () => ({
  default: {
    billingPayment: { findUnique: vi.fn(), updateMany: vi.fn() },
    subscription: { update: vi.fn() },
    billingEvent: { create: vi.fn() },
  },
}));

const db = vi.mocked(prisma, { deep: true });
const provider = getBillingProvider() as unknown as TestProvider;
const SECRET = "admin-secret";
const PAYMENT_ID = "0b6f1d3e-2c4a-4b8e-9f7a-1d2c3b4a5e6f";

const payment = (overrides: Record<string, unknown> = {}) => ({
  id: PAYMENT_ID,
  subscriptionId: "sub-1",
  provider: "mercadopago",
  providerPaymentId: "99",
  status: "approved",
  amount: 1490,
  refundedAmount: 0,
  paidAt: new Date(),
  subscription: subscriptionRow(),
  ...overrides,
});

const refund = (body: object, token = SECRET) =>
  POST(
    new Request("http://localhost/api/billing/admin/refunds", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ paymentId: PAYMENT_ID, ...body }),
    }),
  );

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("BILLING_ADMIN_SECRET", SECRET);
  db.billingPayment.findUnique.mockResolvedValue(payment() as never);
  db.billingPayment.updateMany.mockResolvedValue({ count: 1 });
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/billing/admin/refunds", () => {
  it("sin el secreto de administración es 401", async () => {
    expect((await refund({ mode: "full" }, "wrong")).status).toBe(401);
    expect(provider.refundPayment).not.toHaveBeenCalled();
  });

  it("reembolso total con clave de idempotencia estable", async () => {
    const res = await refund({ mode: "full" });

    expect(await res.json()).toEqual({
      kind: "refunded",
      amount: 1490,
      status: "refunded",
    });
    expect(provider.refundPayment).toHaveBeenCalledWith({
      providerPaymentId: "99",
      amount: 1490,
      idempotencyKey: `refund:${PAYMENT_ID}:0`,
    });
  });

  it("reembolso prorrateado devuelve sólo los días sin usar", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    db.billingPayment.findUnique.mockResolvedValue(payment({ paidAt: tenDaysAgo }) as never);

    const { amount, status } = await (await refund({ mode: "prorated" })).json();

    expect(amount).toBeGreaterThan(900);
    expect(amount).toBeLessThan(1100);
    expect(status).toBe("partially_refunded");
  });

  it("revokeAccess cancela la suscripción al instante", async () => {
    await refund({ mode: "full", revokeAccess: true });

    expect(provider.cancelSubscription).toHaveBeenCalledWith("pre-1");
    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "canceled" }),
      }),
    );
  });

  it("un pago ya reembolsado o sin cobrar es 422", async () => {
    db.billingPayment.findUnique.mockResolvedValue(payment({ status: "refunded", refundedAmount: 1490 }) as never);
    expect((await refund({ mode: "full" })).status).toBe(422);

    db.billingPayment.findUnique.mockResolvedValue(payment({ status: "failed" }) as never);
    expect((await refund({ mode: "full" })).status).toBe(422);
  });

  it("dos reembolsos simultáneos: el segundo es 409 y no se cuenta dos veces", async () => {
    db.billingPayment.updateMany.mockResolvedValue({ count: 0 });
    expect((await refund({ mode: "full" })).status).toBe(409);
  });
});
