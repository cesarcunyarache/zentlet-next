import { describe, expect, it, vi } from "vitest";
import { BillingProviderError, type WebhookNotification } from "../../../../providers/types";
import { HandleWebhookUseCase } from "../handle-webhook.use-case";
import { RecordPaymentUseCase } from "../record-payment.use-case";
import { fakeBilling, subscription } from "./fake-billing";

const req = new Request("http://localhost/api/billing/webhooks/mercadopago", { method: "POST" });

const notification = (overrides: Partial<WebhookNotification> = {}): WebhookNotification => ({
  eventId: "evt-1",
  type: "subscription_preapproval",
  resource: "subscription",
  resourceId: "pre-1",
  ...overrides,
});

function setup() {
  const billing = fakeBilling();
  const recordPayment = new RecordPaymentUseCase(billing.subscriptions, billing.payments, billing.providers, billing.lifecycle);
  const useCase = new HandleWebhookUseCase(
    billing.providers,
    billing.events,
    billing.subscriptions,
    billing.lifecycle,
    recordPayment,
    billing.monitor,
  );
  billing.provider.getSubscription.mockResolvedValue({
    externalId: "pre-1",
    reference: "sub-1",
    status: "active",
    currentPeriodEnd: null,
  });
  return { ...billing, useCase };
}

describe("HandleWebhookUseCase", () => {
  it("un proveedor desconocido o una firma inválida es invalid", async () => {
    const { useCase, provider } = setup();
    expect(await useCase.execute("stripe", req)).toBe("invalid");

    provider.parseWebhook.mockResolvedValue(null);
    expect(await useCase.execute("mercadopago", req)).toBe("invalid");
  });

  it("un evento ya procesado es duplicate y no vuelve a consultar la pasarela", async () => {
    const { useCase, provider, events } = setup();
    provider.parseWebhook.mockResolvedValue(notification());
    vi.mocked(events.claimWebhook).mockResolvedValue({ id: "event-1", processedAt: new Date() });

    expect(await useCase.execute("mercadopago", req)).toBe("duplicate");
    expect(provider.getSubscription).not.toHaveBeenCalled();
  });

  it("un recurso que no interesa se marca como ignorado", async () => {
    const { useCase, provider, events } = setup();
    provider.parseWebhook.mockResolvedValue(notification({ resource: "ignored" }));

    expect(await useCase.execute("mercadopago", req)).toBe("ignored");
    expect(events.markProcessed).toHaveBeenCalledWith("event-1", { kind: "ignored" });
  });

  it("aplica el estado de la suscripción encontrada por referencia y la asocia al evento", async () => {
    const { useCase, provider, subscriptions, events } = setup();
    provider.parseWebhook.mockResolvedValue(notification());
    vi.mocked(subscriptions.findByReference).mockResolvedValue(subscription({ externalId: null, status: "pending" }));

    expect(await useCase.execute("mercadopago", req)).toBe("processed");
    expect(subscriptions.findByReference).toHaveBeenCalledWith("mercadopago", "sub-1");
    expect(events.markProcessed).toHaveBeenCalledWith("event-1", {
      kind: "matched",
      subscription: expect.objectContaining({ id: "sub-1", userId: "user-1" }),
    });
  });

  it("si la referencia apunta a otra suscripción no la toca y avisa", async () => {
    const { useCase, provider, subscriptions, events, monitor } = setup();
    provider.parseWebhook.mockResolvedValue(notification());
    vi.mocked(subscriptions.findByExternalId).mockResolvedValue(subscription({ id: "sub-otra" }));

    expect(await useCase.execute("mercadopago", req)).toBe("processed");
    expect(subscriptions.applyProviderState).not.toHaveBeenCalled();
    expect(monitor.warn).toHaveBeenCalledWith("billing.webhook_reference_mismatch", expect.any(Object));
    expect(events.markProcessed).toHaveBeenCalledWith("event-1", { kind: "unmatched" });
  });

  it("un recurso que ya no existe en la pasarela queda sin emparejar", async () => {
    const { useCase, provider, events } = setup();
    provider.parseWebhook.mockResolvedValue(notification());
    provider.getSubscription.mockRejectedValue(new BillingProviderError("gone", 404));

    expect(await useCase.execute("mercadopago", req)).toBe("processed");
    expect(events.markProcessed).toHaveBeenCalledWith("event-1", { kind: "unmatched" });
  });

  it("otros errores de la pasarela se propagan para que reintente", async () => {
    const { useCase, provider, events } = setup();
    provider.parseWebhook.mockResolvedValue(notification());
    provider.getSubscription.mockRejectedValue(new BillingProviderError("boom", 500));

    await expect(useCase.execute("mercadopago", req)).rejects.toThrow("boom");
    expect(events.markProcessed).not.toHaveBeenCalled();
  });
});
