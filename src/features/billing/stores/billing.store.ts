"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Feature } from "../lib/plans";
import { billingService } from "../services/billing.service";
import type { BillingSummary } from "../types";

const SUMMARY_KEY = ["billing", "summary"] as const;

const SUMMARY_STALE_MS = 60_000;

export function useBillingSummary() {
  const query = useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: () => billingService.getSummary(),
    staleTime: SUMMARY_STALE_MS,
  });
  const canUse = (feature: Feature) => query.data?.features.includes(feature) ?? true;
  return { summary: query.data, canUse, isLoading: query.isPending };
}

export function useSetBillingSummary() {
  const queryClient = useQueryClient();
  return useCallback(
    (summary: BillingSummary) => queryClient.setQueryData(SUMMARY_KEY, summary),
    [queryClient],
  );
}
