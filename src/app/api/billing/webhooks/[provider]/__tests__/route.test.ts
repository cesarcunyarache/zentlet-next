import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { getBillingProvider } from "@/features/billing/providers";
import { BillingProviderError } from "@/features/billing/providers/types";
import { subscriptionRow, type TestProvider } from "@/features/billing/__tests__/test-provider";
import { POST } from "../route";

vi.mock("@/features/billing/providers", () =>
  import("@/features/billing/__tests__/test-provider").then((module) => module.mockedProvidersModule()),
);
vi.mock("@/lib/prisma", () => ({
  default: {
    subscription: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    billingPayment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    billingEvent: {
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const db = vi.mocked(prisma, { deep: true });
const provider = getBillingProvider() as unknown as TestProvider;
const DAY_MS = 24 * 60 * 60 * 1000;
const uniqueViolation = Object.assign(new Error("Unique constraint failed"), {
  code: "P2002",
});

const notification = (resource: "subscription" | "payment" | "ignored", resourceId = "pre-1") => ({
  eventId: `evt-${resource}`,
  type: resource === "payment" ? "subscription_authorized_payment" : "subscription_preapproval",
  resource,
  resourceId,
});

const deliver = (providerName = "mercadopago") =>
  POST(
    new Request(`http://localhost/api/billing/webhooks/${providerName}`, {
      method: "POST",
      body: "{}",
    }),
    {
      params: Promise.resolve({ provider: providerName }),
    },
  );

const statusUpdate = () =>
  db.subscription.update.mock.calls.map(([args]) => (args as { data: { status?: string } }).data.status).find(Boolean);

beforeEach(() => {
  vi.resetAllMocks();
  db.billingEvent.create.mockResolvedValue({
    id: "evt-row",
    processedAt: null,
  } as never);
  db.billingPayment.findFirst.mockResolvedValue(null);
  db.subscription.findUnique.mockResolvedValue(subscriptionRow({ status: "pending" }) as never);
  db.subscription.update.mockImplementation((({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(subscriptionRow(data))) as never);
  provider.getSubscription.mockResolvedValue({
    externalId: "pre-1",
    reference: "sub-1",
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 30 * DAY_MS),
  });
});

describe("POST /api/billing/webhooks/[provider]", () => {
  it("una firma inválida es 401 y no toca la base de datos", async () => {
    provider.parseWebhook.mockResolvedValue(null);

    expect((await deliver()).status).toBe(401);
    expect(db.billingEvent.create).not.toHaveBeenCalled();
  });

  it("un proveedor desconocido es 401", async () => {
    expect((await deliver("paypal")).status).toBe(401);
  });

  it("activa la suscripción con el estado que devuelve la pasarela, no con el payload", async () => {
    provider.parseWebhook.mockResolvedValue(notification("subscription"));

    const res = await deliver();

    expect(await res.json()).toEqual({ outcome: "processed" });
    expect(provider.getSubscription).toHaveBeenCalledWith("pre-1");
    expect(statusUpdate()).toBe("active");
    expect(db.billingEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subscriptionId: "sub-1",
          userId: "user-1",
        }),
      }),
    );
  });

  it("autorizada durante la prueba queda en trialing", async () => {
    provider.parseWebhook.mockResolvedValue(notification("subscription"));
    db.subscription.findUnique.mockResolvedValue(
      subscriptionRow({
        status: "pending",
        trialEndsAt: new Date(Date.now() + 15 * DAY_MS),
      }) as never,
    );

    await deliver();

    expect(statusUpdate()).toBe("trialing");
  });

  it("una notificación repetida ya procesada no se procesa dos veces", async () => {
    provider.parseWebhook.mockResolvedValue(notification("subscription"));
    db.billingEvent.create.mockRejectedValue(uniqueViolation);
    db.billingEvent.findUniqueOrThrow.mockResolvedValue({
      id: "evt-row",
      processedAt: new Date(),
    } as never);

    expect(await (await deliver()).json()).toEqual({ outcome: "duplicate" });
    expect(provider.getSubscription).not.toHaveBeenCalled();
  });

  it("un reintento de una notificación que falló se vuelve a procesar", async () => {
    provider.parseWebhook.mockResolvedValue(notification("subscription"));
    db.billingEvent.create.mockRejectedValue(uniqueViolation);
    db.billingEvent.findUniqueOrThrow.mockResolvedValue({
      id: "evt-row",
      processedAt: null,
    } as never);

    expect(await (await deliver()).json()).toEqual({ outcome: "processed" });
    expect(provider.getSubscription).toHaveBeenCalled();
  });

  it("un cobro rechazado deja la suscripción en past_due", async () => {
    provider.parseWebhook.mockResolvedValue(notification("payment", "7001"));
    db.subscription.findUnique.mockResolvedValue(subscriptionRow({ status: "active" }) as never);
    db.billingPayment.findFirst.mockResolvedValue({
      status: "failed",
    } as never);
    provider.getPayment.mockResolvedValue({
      externalId: "7001",
      subscriptionExternalId: "pre-1",
      providerPaymentId: "99",
      status: "failed",
      amount: 1490,
      currency: "PEN",
      paidAt: null,
    });

    await deliver();

    expect(db.billingPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: "failed" }),
      }),
    );
    expect(statusUpdate()).toBe("past_due");
  });

  it("una referencia que no coincide no modifica ninguna suscripción", async () => {
    provider.parseWebhook.mockResolvedValue(notification("subscription"));
    provider.getSubscription.mockResolvedValue({
      externalId: "pre-1",
      reference: "sub-otro",
      status: "active",
      currentPeriodEnd: null,
    });

    await deliver();

    expect(db.subscription.update).not.toHaveBeenCalled();
  });

  it("un recurso que no existe en la pasarela (simulación) responde 200 sin tocar suscripciones", async () => {
    provider.parseWebhook.mockResolvedValue(notification("subscription", "123456"));
    provider.getSubscription.mockRejectedValue(new BillingProviderError("not found", 404));

    expect(await (await deliver()).json()).toEqual({ outcome: "processed" });
    expect(db.subscription.update).not.toHaveBeenCalled();
  });

  it("un tópico que no usamos se registra y se ignora", async () => {
    provider.parseWebhook.mockResolvedValue(notification("ignored"));

    expect(await (await deliver()).json()).toEqual({ outcome: "ignored" });
    expect(provider.getSubscription).not.toHaveBeenCalled();
  });
});
