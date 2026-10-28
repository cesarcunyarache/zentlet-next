import { describe, expect, it, vi } from "vitest";
import { SyncUserSubscriptionUseCase } from "../sync-user-subscription.use-case";
import { fakeBilling, NOW, subscription } from "./fake-billing";

const snapshot = (status: "active" | "canceled") => ({
  externalId: "pre-1",
  reference: "sub-1",
  status,
  currentPeriodEnd: null,
});

describe("SubscriptionLifecycle.applySnapshot", () => {
  it("guarda el estado del proveedor, olvida el plan en caché y registra el cambio", async () => {
    const { lifecycle, subscriptions, planCache, events } = fakeBilling();

    await lifecycle.applySnapshot(subscription({ status: "pending" }), snapshot("active"), NOW);

    expect(subscriptions.applyProviderState).toHaveBeenCalledWith("sub-1", expect.objectContaining({ status: "active" }));
    expect(planCache.forget).toHaveBeenCalledWith("user-1");
    expect(events.record).toHaveBeenCalledWith(
      expect.objectContaining({ type: "subscription.status_changed", data: { from: "pending", to: "active" } }),
    );
  });

  it("sin cambio de estado no registra evento", async () => {
    const { lifecycle, events } = fakeBilling();

    await lifecycle.applySnapshot(subscription({ status: "active" }), snapshot("active"), NOW);

    expect(events.record).not.toHaveBeenCalled();
  });

  it("al cancelarse por primera vez anota la fecha; si ya estaba cancelada conserva la original", async () => {
    const { lifecycle, subscriptions } = fakeBilling();
    const originalCancel = new Date("2026-10-01T00:00:00Z");

    await lifecycle.applySnapshot(subscription({ status: "active" }), snapshot("canceled"), NOW);
    await lifecycle.applySnapshot(subscription({ status: "canceled", canceledAt: originalCancel }), snapshot("canceled"), NOW);

    expect(subscriptions.applyProviderState).toHaveBeenNthCalledWith(1, "sub-1", expect.objectContaining({ canceledAt: NOW }));
    expect(subscriptions.applyProviderState).toHaveBeenNthCalledWith(
      2,
      "sub-1",
      expect.objectContaining({ canceledAt: originalCancel }),
    );
  });

  it("un pago fallido convierte una suscripción activa en past_due", async () => {
    const { lifecycle, subscriptions, payments } = fakeBilling();
    vi.mocked(payments.findLatestStatus).mockResolvedValue("failed");

    await lifecycle.applySnapshot(subscription({ status: "active" }), snapshot("active"), NOW);

    expect(subscriptions.applyProviderState).toHaveBeenCalledWith("sub-1", expect.objectContaining({ status: "past_due" }));
  });
});

describe("SyncUserSubscriptionUseCase", () => {
  it("sin suscripción viva no consulta al proveedor", async () => {
    const { subscriptions, lifecycle, provider } = fakeBilling();

    await new SyncUserSubscriptionUseCase(subscriptions, lifecycle).execute("user-1");

    expect(provider.getSubscription).not.toHaveBeenCalled();
  });

  it("sincroniza la suscripción viva con el proveedor", async () => {
    const { subscriptions, lifecycle, provider } = fakeBilling();
    vi.mocked(subscriptions.findLive).mockResolvedValue(subscription());
    provider.getSubscription.mockResolvedValue(snapshot("active"));

    await new SyncUserSubscriptionUseCase(subscriptions, lifecycle).execute("user-1");

    expect(provider.getSubscription).toHaveBeenCalledWith("pre-1");
    expect(subscriptions.applyProviderState).toHaveBeenCalled();
  });
});
