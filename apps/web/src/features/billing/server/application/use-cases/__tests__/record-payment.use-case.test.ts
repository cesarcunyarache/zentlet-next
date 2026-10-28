import { describe, expect, it, vi } from "vitest";
import type { PaymentSnapshot } from "../../../../providers/types";
import { RecordPaymentUseCase } from "../record-payment.use-case";
import { fakeBilling, subscription } from "./fake-billing";

const snapshot: PaymentSnapshot = {
  externalId: "charge-1",
  subscriptionExternalId: "pre-1",
  providerPaymentId: "mp-1",
  status: "approved",
  amount: 1490,
  currency: "PEN",
  paidAt: new Date("2026-10-16T12:00:00Z"),
};

function setup() {
  const billing = fakeBilling();
  const useCase = new RecordPaymentUseCase(billing.subscriptions, billing.payments, billing.providers, billing.lifecycle);
  billing.provider.getSubscription.mockResolvedValue({
    externalId: "pre-1",
    reference: "sub-1",
    status: "active",
    currentPeriodEnd: null,
  });
  return { ...billing, useCase };
}

describe("RecordPaymentUseCase", () => {
  it("un pago de una suscripción desconocida se ignora", async () => {
    const { useCase, payments } = setup();

    expect(await useCase.execute("mercadopago", snapshot)).toBeNull();
    expect(payments.upsert).not.toHaveBeenCalled();
  });

  it("guarda el pago y actualiza la suscripción con el estado de la pasarela", async () => {
    const { useCase, subscriptions, payments } = setup();
    vi.mocked(subscriptions.findByExternalId).mockResolvedValue(subscription());

    expect(await useCase.execute("mercadopago", snapshot)).toMatchObject({ id: "sub-1" });
    expect(payments.upsert).toHaveBeenCalledWith(expect.objectContaining({ subscriptionId: "sub-1", status: "approved" }));
    expect(subscriptions.applyProviderState).toHaveBeenCalledWith("sub-1", expect.objectContaining({ status: "active" }));
  });

  it.each(["refunded", "partially_refunded"] as const)(
    "un %s hecho aquí no se pisa si la pasarela todavía dice approved",
    async (localStatus) => {
      const { useCase, subscriptions, payments } = setup();
      vi.mocked(subscriptions.findByExternalId).mockResolvedValue(subscription());
      vi.mocked(payments.findStatus).mockResolvedValue(localStatus);

      await useCase.execute("mercadopago", snapshot);

      expect(payments.upsert).toHaveBeenCalledWith(expect.objectContaining({ status: localStatus }));
    },
  );

  it("un estado nuevo de la pasarela distinto de approved sí se guarda", async () => {
    const { useCase, subscriptions, payments } = setup();
    vi.mocked(subscriptions.findByExternalId).mockResolvedValue(subscription());
    vi.mocked(payments.findStatus).mockResolvedValue("refunded");

    await useCase.execute("mercadopago", { ...snapshot, status: "failed" });

    expect(payments.upsert).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
  });
});
