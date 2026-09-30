"use client";

import { useEffect } from "react";
import { billingService } from "../services/billing.service";
import { useSetBillingSummary } from "../stores/billing.store";

const RETURN_PARAM = "billing";
const RETURN_VALUE = "return";

function clearReturnParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete(RETURN_PARAM);
  window.history.replaceState(window.history.state, "", url);
}

export function useBillingReturn() {
  const setSummary = useSetBillingSummary();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get(RETURN_PARAM) !== RETURN_VALUE) return;
    clearReturnParam();
    billingService
      .sync()
      .then(setSummary)
      .catch(() => undefined);
  }, [setSummary]);
}
