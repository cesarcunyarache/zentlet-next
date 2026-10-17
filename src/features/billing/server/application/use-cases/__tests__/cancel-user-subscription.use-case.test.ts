import { describe, expect, it, vi } from "vitest";
import { CancelUserSubscriptionUseCase } from "../cancel-user-subscription.use-case";
import { fakeBilling, subscription } from "./fake-billing";

function setup() {
  const billing = fakeBilling();
  const useCase = new CancelUserSubscriptionUseCase(billing.subscriptions, billing.lifecycle);
  return { ...billing, useCase };
}

describe("CancelUserSubscriptionUseCase", () => {
  it("sin suscripción viva no hace nada", async () => {
    const { useCase, provider } = setup();

    expect(await useCase.execute("user-1")).toBe(false);
    expect(provider.cancelSubscription).not.toHaveBeenCalled();
  });

  it("cancela en la pasarela y conserva el acceso hasta el fin del periodo pagado", async () => {
    const { useCase, subscriptions, provider, events } = setup();
    const periodEnd = new Date("2026-11-01T00:00:00Z");
    vi.mocked(subscriptions.findLive).mockResolvedValue(subscription({ currentPeriodEnd: periodEnd }));

    expect(await useCase.execute("user-1")).toBe(true);
    expect(provider.cancelSubscription).toHaveBeenCalledWith("pre-1");
    expect(subscriptions.markCanceled).toHaveBeenCalledWith("sub-1", {
      canceledAt: expect.any(Date),
      accessUntil: periodEnd,
    });
    expect(events.record).toHaveBeenCalledWith(expect.objectContaining({ source: "user", type: "subscription.canceled" }));
  });

  it("una pendiente se abandona en lugar de cancelarse", async () => {
    const { useCase, subscriptions } = setup();
    vi.mocked(subscriptions.findLive).mockResolvedValue(subscription({ status: "pending" }));

    await useCase.execute("user-1", "system");

    expect(subscriptions.markAbandoned).toHaveBeenCalledWith("sub-1", expect.any(Date));
    expect(subscriptions.markCanceled).not.toHaveBeenCalled();
  });
});
