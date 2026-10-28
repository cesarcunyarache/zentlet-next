"use client";

import { useEffect, useRef } from "react";
import { billingService } from "../services/billing.service";
import { useBillingSummary, useSetBillingSummary } from "../stores/billing.store";

const RETURN_PARAM = "billing";
const RETURN_VALUE = "return";

function consumeReturnParam() {
  const url = new URL(window.location.href);
  if (url.searchParams.get(RETURN_PARAM) !== RETURN_VALUE) return false;
  url.searchParams.delete(RETURN_PARAM);
  window.history.replaceState(window.history.state, "", url);
  return true;
}

export function useBillingReturn() {
  const setSummary = useSetBillingSummary();
  const { summary } = useBillingSummary();
  const hasSynced = useRef(false);
  const hasPendingCheckout = summary?.hasPendingCheckout ?? false;

  useEffect(() => {
    if (hasSynced.current) return;
    const isReturning = consumeReturnParam();
    if (!isReturning && !hasPendingCheckout) return;
    hasSynced.current = true;
    billingService.sync().then(setSummary).catch(() => undefined);
  }, [hasPendingCheckout, setSummary]);
}
