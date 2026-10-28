import { describe, expect, it, vi } from "vitest";
import { planFeatures } from "../../../../lib/plans";
import { GetBillingSummaryUseCase } from "../get-billing-summary.use-case";
import { GetEffectivePlanUseCase } from "../get-effective-plan.use-case";
import { HasFeatureUseCase } from "../has-feature.use-case";
import { DAY_MS, fakeBilling, NOW, subscription } from "./fake-billing";

const grant = (isEnabled: boolean) => ({ isEnabled: () => isEnabled });

describe("GetBillingSummaryUseCase", () => {
  it("sin suscripciones es free, con prueba disponible y precio del plan ofrecido", async () => {
    const { subscriptions } = fakeBilling();

    const summary = await new GetBillingSummaryUseCase(subscriptions, grant(false)).execute("user-1", NOW);

    expect(summary).toMatchObject({
      plan: "free",
      features: [...planFeatures("free")],
      status: null,
      isTrialEligible: true,
      hasPendingCheckout: false,
      price: { currency: "PEN" },
    });
  });

  it("muestra la última suscripción asentada aunque haya un checkout pendiente más nuevo", async () => {
    const { subscriptions } = fakeBilling();
    const periodEnd = new Date(NOW.getTime() + 10 * DAY_MS);
    vi.mocked(subscriptions.findHistory).mockResolvedValue([
      subscription({ id: "sub-new", status: "pending" }),
      subscription({ id: "sub-active", status: "active", currentPeriodEnd: periodEnd }),
    ]);

    const summary = await new GetBillingSummaryUseCase(subscriptions, grant(false)).execute("user-1", NOW);

    expect(summary).toMatchObject({
      plan: "pro",
      status: "active",
      currentPeriodEnd: periodEnd.toISOString(),
      hasPendingCheckout: true,
    });
  });

  it("con el acceso de prueba activo cualquiera es pro", async () => {
    const { subscriptions } = fakeBilling();

    const summary = await new GetBillingSummaryUseCase(subscriptions, grant(true)).execute("user-1", NOW);

    expect(summary.plan).toBe("pro");
  });
});

describe("GetEffectivePlanUseCase", () => {
  it("calcula el plan a través de la caché", async () => {
    const { subscriptions, planCache } = fakeBilling();
    vi.mocked(subscriptions.findHistory).mockResolvedValue([subscription({ status: "active" })]);

    expect(await new GetEffectivePlanUseCase(subscriptions, planCache, grant(false)).execute("user-1")).toBe("pro");
    expect(planCache.get).toHaveBeenCalledWith("user-1", expect.any(Function));
  });

  it("sin suscripción que dé acceso es free, salvo con el acceso de prueba", async () => {
    const { subscriptions, planCache } = fakeBilling();

    expect(await new GetEffectivePlanUseCase(subscriptions, planCache, grant(false)).execute("user-1")).toBe("free");
    expect(await new GetEffectivePlanUseCase(subscriptions, planCache, grant(true)).execute("user-1")).toBe("pro");
  });
});

describe("HasFeatureUseCase", () => {
  it("responde según las funciones del plan efectivo", async () => {
    const { subscriptions, planCache } = fakeBilling();
    const effectivePlan = new GetEffectivePlanUseCase(subscriptions, planCache, grant(false));
    const hasFeature = new HasFeatureUseCase(effectivePlan);

    expect(await hasFeature.execute("user-1", "transactions")).toBe(true);
    expect(await hasFeature.execute("user-1", "export")).toBe(false);
  });
});
