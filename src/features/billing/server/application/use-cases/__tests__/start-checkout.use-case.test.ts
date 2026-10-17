import { describe, expect, it, vi } from "vitest";
import { StartCheckoutUseCase } from "../start-checkout.use-case";
import { DAY_MS, fakeBilling, NOW, subscription } from "./fake-billing";

const request = { email: "ana@example.com", planKey: "pro" as const, returnUrl: "https://app.test/return" };

function setup() {
  const billing = fakeBilling();
  const useCase = new StartCheckoutUseCase(billing.subscriptions, billing.providers, billing.events, billing.lifecycle);
  return { ...billing, useCase };
}

describe("StartCheckoutUseCase", () => {
  it("primer checkout: crea la pendiente con prueba, abre la pasarela y registra el evento", async () => {
    const { useCase, subscriptions, provider, events } = setup();

    const outcome = await useCase.execute("user-1", request, NOW);

    expect(outcome).toEqual({ kind: "redirect", checkoutUrl: "https://pay.test/checkout" });
    expect(subscriptions.createPending).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", planKey: "pro", trialEndsAt: new Date(NOW.getTime() + 15 * DAY_MS) }),
    );
    expect(provider.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ subscriptionId: "sub-new" }));
    expect(subscriptions.attachCheckout).toHaveBeenCalledWith("sub-new", "pre-new", "https://pay.test/checkout");
    expect(events.record).toHaveBeenCalledWith(expect.objectContaining({ type: "checkout.started" }));
  });

  it("con una suscripción activa no abre otra", async () => {
    const { useCase, subscriptions } = setup();
    vi.mocked(subscriptions.findHistory).mockResolvedValue([subscription({ status: "active" })]);

    expect(await useCase.execute("user-1", request, NOW)).toEqual({ kind: "already_subscribed" });
    expect(subscriptions.createPending).not.toHaveBeenCalled();
  });

  it("reutiliza un checkout pendiente reciente", async () => {
    const { useCase, subscriptions } = setup();
    const pending = subscription({ status: "pending", checkoutUrl: "https://pay.test/old", createdAt: NOW });
    vi.mocked(subscriptions.findHistory).mockResolvedValue([pending]);

    expect(await useCase.execute("user-1", request, NOW)).toEqual({ kind: "redirect", checkoutUrl: "https://pay.test/old" });
    expect(subscriptions.createPending).not.toHaveBeenCalled();
  });

  it("abandona un checkout pendiente vencido y crea uno nuevo", async () => {
    const { useCase, subscriptions } = setup();
    const stale = subscription({
      id: "sub-old",
      status: "pending",
      checkoutUrl: "https://pay.test/old",
      createdAt: new Date(NOW.getTime() - 2 * DAY_MS),
    });
    vi.mocked(subscriptions.findHistory).mockResolvedValue([stale]);

    const outcome = await useCase.execute("user-1", request, NOW);

    expect(subscriptions.markAbandoned).toHaveBeenCalledWith("sub-old", NOW);
    expect(outcome).toEqual({ kind: "redirect", checkoutUrl: "https://pay.test/checkout" });
  });

  it("si otra petición ya creó la suscripción viva, está en curso y no llama a la pasarela", async () => {
    const { useCase, subscriptions, provider } = setup();
    vi.mocked(subscriptions.createPending).mockResolvedValue("live_exists");

    expect(await useCase.execute("user-1", request, NOW)).toEqual({ kind: "in_progress" });
    expect(provider.createCheckout).not.toHaveBeenCalled();
  });

  it("si la pasarela falla abandona la pendiente y propaga el error", async () => {
    const { useCase, subscriptions, provider } = setup();
    provider.createCheckout.mockRejectedValue(new Error("timeout"));

    await expect(useCase.execute("user-1", request, NOW)).rejects.toThrow("timeout");
    expect(subscriptions.markAbandoned).toHaveBeenCalledWith("sub-new", expect.any(Date));
  });
});
