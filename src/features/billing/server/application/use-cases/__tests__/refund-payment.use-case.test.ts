import { describe, expect, it, vi } from "vitest";
import { RefundPaymentUseCase } from "../refund-payment.use-case";
import { fakeBilling, NOW, payment } from "./fake-billing";

function setup() {
  const billing = fakeBilling();
  const useCase = new RefundPaymentUseCase(billing.payments, billing.providers, billing.events, billing.lifecycle);
  return { ...billing, useCase };
}

const fullRefund = { paymentId: "pay-1", mode: "full" as const, revokeAccess: false };

describe("RefundPaymentUseCase", () => {
  it("devuelve el total en la pasarela, lo anota y registra el evento", async () => {
    const { useCase, payments, provider, events } = setup();
    vi.mocked(payments.findWithSubscription).mockResolvedValue(payment());

    const outcome = await useCase.execute(fullRefund, NOW);

    expect(outcome).toEqual({ kind: "refunded", amount: 1490, status: "refunded" });
    expect(provider.refundPayment).toHaveBeenCalledWith({
      providerPaymentId: "mp-1",
      amount: 1490,
      idempotencyKey: "refund:pay-1:0",
    });
    expect(payments.recordRefund).toHaveBeenCalledWith("pay-1", {
      previousRefundedAmount: 0,
      refundedAmount: 1490,
      status: "refunded",
    });
    expect(events.record).toHaveBeenCalledWith(expect.objectContaining({ type: "payment.refunded" }));
  });

  it("un pago que no existe es not_found", async () => {
    expect(await setup().useCase.execute(fullRefund, NOW)).toEqual({ kind: "not_found" });
  });

  it.each([
    ["sin id de la pasarela", { providerPaymentId: null }],
    ["fallido", { status: "failed" as const }],
    ["ya devuelto del todo", { status: "refunded" as const, refundedAmount: 1490 }],
  ])("un pago %s no se puede devolver", async (_, overrides) => {
    const { useCase, payments, provider } = setup();
    vi.mocked(payments.findWithSubscription).mockResolvedValue(payment(overrides));

    expect(await useCase.execute(fullRefund, NOW)).toEqual({ kind: "not_refundable" });
    expect(provider.refundPayment).not.toHaveBeenCalled();
  });

  it("si otro reembolso cambió el pago entre tanto es conflict y no revoca", async () => {
    const { useCase, payments, subscriptions } = setup();
    vi.mocked(payments.findWithSubscription).mockResolvedValue(payment());
    vi.mocked(payments.recordRefund).mockResolvedValue("conflict");

    expect(await useCase.execute({ ...fullRefund, revokeAccess: true }, NOW)).toEqual({ kind: "conflict" });
    expect(subscriptions.markCanceled).not.toHaveBeenCalled();
  });

  it("con revokeAccess cancela al momento", async () => {
    const { useCase, payments, subscriptions } = setup();
    vi.mocked(payments.findWithSubscription).mockResolvedValue(payment());

    await useCase.execute({ ...fullRefund, revokeAccess: true }, NOW);

    expect(subscriptions.markCanceled).toHaveBeenCalledWith("sub-1", { canceledAt: NOW, accessUntil: NOW });
  });
});
