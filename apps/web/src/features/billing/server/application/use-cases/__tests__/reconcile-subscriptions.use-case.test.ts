import { describe, expect, it, vi } from "vitest";
import { ReconcileSubscriptionsUseCase } from "../reconcile-subscriptions.use-case";
import { DAY_MS, fakeBilling, NOW, subscription } from "./fake-billing";

function setup() {
  const billing = fakeBilling();
  const useCase = new ReconcileSubscriptionsUseCase(billing.subscriptions, billing.lifecycle, billing.monitor);
  return { ...billing, useCase };
}

describe("ReconcileSubscriptionsUseCase", () => {
  it("busca las pendientes de hace más de una hora y los periodos vencidos", async () => {
    const { useCase, subscriptions } = setup();

    await useCase.execute(NOW);

    expect(subscriptions.findDue).toHaveBeenCalledWith({
      pendingCreatedBefore: new Date(NOW.getTime() - 60 * 60 * 1000),
      periodEndedBefore: NOW,
      limit: 100,
    });
  });

  it("sincroniza, abandona las pendientes de más de 7 días y cuenta los fallos sin cortar el lote", async () => {
    const { useCase, subscriptions, provider, monitor } = setup();
    const synced = subscription({ id: "sub-ok", externalId: null });
    const abandoned = subscription({
      id: "sub-old",
      status: "pending",
      externalId: null,
      createdAt: new Date(NOW.getTime() - 8 * DAY_MS),
    });
    const broken = subscription({ id: "sub-broken", externalId: "pre-broken" });
    vi.mocked(subscriptions.findDue).mockResolvedValue([synced, abandoned, broken]);
    provider.getSubscription.mockRejectedValue(new Error("timeout"));

    expect(await useCase.execute(NOW)).toEqual({ synced: 1, abandoned: 1, failed: 1 });
    expect(subscriptions.markAbandoned).toHaveBeenCalledWith("sub-old", NOW);
    expect(monitor.failed).toHaveBeenCalledWith(expect.any(Error), "billing.reconcile_failed", {
      subscriptionId: "sub-broken",
    });
  });
});
