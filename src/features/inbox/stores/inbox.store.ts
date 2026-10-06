"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { useBillingSummary } from "@/features/billing/stores/billing.store";
import { transactionKeys } from "@/features/transaction/stores/transaction.keys";
import type { AcceptInboxItemInput } from "../schemas/inbox-api.schema";
import { inboxService } from "../services/inbox.service";
import type { TInboxConnection, TInboxItem } from "../types";

export const inboxKeys = {
  items: ["inbox", "items"] as const,
  connection: ["inbox", "connection"] as const,
};

const ITEMS_STALE_MS = 30_000;
const EMPTY: TInboxItem[] = [];

export function useInboxItems() {
  // const { canUse } = useBillingSummary();
  const query = useQuery({
    queryKey: inboxKeys.items,
    queryFn: () => inboxService.getItems(),
    // enabled: canUse("email_import"),
    staleTime: ITEMS_STALE_MS,
    refetchOnWindowFocus: "always",
  });
  return { items: query.data ?? EMPTY, isLoading: query.isPending };
}

function useRemoveItem() {
  const queryClient = useQueryClient();
  return (id: string) =>
    queryClient.setQueryData<TInboxItem[]>(inboxKeys.items, (items) => items?.filter((item) => item.id !== id));
}

export function useAcceptInboxItem() {
  const queryClient = useQueryClient();
  const removeItem = useRemoveItem();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: AcceptInboxItemInput }) => inboxService.accept(id, values),
    onSuccess: (_, { id }) => {
      removeItem(id);
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      void queryClient.invalidateQueries({ queryKey: inboxKeys.connection });
    },
    onError: () => queryClient.invalidateQueries({ queryKey: inboxKeys.items }),
  });
}

export function useDismissInboxItem() {
  const queryClient = useQueryClient();
  const removeItem = useRemoveItem();
  return useMutation({
    mutationFn: (id: string) => inboxService.dismiss(id),
    onMutate: removeItem,
    onSettled: () => queryClient.invalidateQueries({ queryKey: inboxKeys.connection }),
    onError: () => queryClient.invalidateQueries({ queryKey: inboxKeys.items }),
  });
}

export function useInboxConnection(isEnabled: boolean) {
  return useQuery({
    queryKey: inboxKeys.connection,
    queryFn: () => inboxService.getConnection(),
    enabled: isEnabled,
    refetchOnWindowFocus: "always",
  });
}

function useSetConnection() {
  const queryClient = useQueryClient();
  return (connection: TInboxConnection) => queryClient.setQueryData(inboxKeys.connection, connection);
}

function useRefreshConnection() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: inboxKeys.connection });
}

export function useCreateInboxAddress() {
  const setConnection = useSetConnection();
  return useMutation({ mutationFn: () => inboxService.connect(), onSuccess: setConnection });
}

export function useDisconnectGmail() {
  const setConnection = useSetConnection();
  return useMutation({ mutationFn: () => inboxService.disconnectGmail(), onSuccess: setConnection });
}

export function useAddInboxSender() {
  const refresh = useRefreshConnection();
  return useMutation({ mutationFn: (address: string) => inboxService.addSender(address), onSuccess: refresh });
}

export function useRemoveInboxSender() {
  const refresh = useRefreshConnection();
  return useMutation({ mutationFn: (id: string) => inboxService.removeSender(id), onSuccess: refresh });
}
