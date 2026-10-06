"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { recurringService } from "../services/recurring.service";

export const recurringKeys = {
  detail: (id: string) => ["recurring", id] as const,
};

export function useRecurringTransaction(id: string) {
  return useQuery({
    queryKey: recurringKeys.detail(id),
    queryFn: () => recurringService.getRecurringTransaction(id),
  });
}

export function useStopRecurringTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recurringService.stopRecurringTransaction(id),
    onSuccess: (_, id) => queryClient.setQueryData(recurringKeys.detail(id), null),
  });
}
