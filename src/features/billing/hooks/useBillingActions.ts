"use client";

import { useState } from "react";
import { track } from "@/lib/observability/client";
import { billingService } from "../services/billing.service";
import { useSetBillingSummary } from "../stores/billing.store";

type ActionStatus = "idle" | "working" | "confirming" | "failed";

export function useBillingActions() {
  const setSummary = useSetBillingSummary();
  const [status, setStatus] = useState<ActionStatus>("idle");

  async function run(action: () => Promise<void>) {
    setStatus("working");
    try {
      await action();
    } catch {
      setStatus("failed");
    }
  }

  const upgrade = () =>
    run(async () => {
      const { redirectUrl } = await billingService.startCheckout({ planKey: "pro" });
      window.location.assign(redirectUrl);
    });

  function cancel() {
    if (status !== "confirming") return setStatus("confirming");
    return run(async () => {
      setSummary(await billingService.cancel());
      track("subscription_canceled", {});
      setStatus("idle");
    });
  }

  return {
    upgrade,
    cancel,
    isWorking: status === "working",
    isConfirming: status === "confirming",
    hasFailed: status === "failed",
  };
}
