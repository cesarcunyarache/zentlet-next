"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { transactionKeys } from "@/features/transaction/stores/transaction.keys";
import { listService } from "../services/list.service";
import type { InviteRole, TList, TListPayload } from "../types";

const ENTRIES_PAGE_SIZE = 50;

export const listKeys = {
  all: ["lists"] as const,
  index: ["lists", "index"] as const,
  detail: (listId: string) => ["lists", "detail", listId] as const,
  entries: (listId: string) => ["lists", "entries", listId] as const,
  invites: (listId: string) => ["lists", "invites", listId] as const,
  invite: (token: string) => ["lists", "invite", token] as const,
};

function refreshLists(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: listKeys.all }),
    queryClient.invalidateQueries({ queryKey: transactionKeys.lists }),
  ]);
}

export function useLists() {
  const query = useQuery({ queryKey: listKeys.index, queryFn: () => listService.getLists() });
  return { lists: query.data ?? [], isLoading: query.isLoading, isError: query.isError };
}

export function useListDetail(listId: string) {
  return useQuery({ queryKey: listKeys.detail(listId), queryFn: () => listService.getList(listId) });
}

export function useListEntries(listId: string) {
  const query = useInfiniteQuery({
    queryKey: listKeys.entries(listId),
    queryFn: ({ pageParam }) => listService.getEntries(listId, pageParam, ENTRIES_PAGE_SIZE),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
  const entries = query.data?.pages.flatMap((page) => page.items) ?? [];
  return { ...query, entries };
}

export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: (payload: TListPayload) => listService.createList({ id: crypto.randomUUID(), ...payload }),
    onSuccess: (created) => {
      queryClient.setQueryData<TList[]>(listKeys.index, (lists) => [created, ...(lists ?? [])]);
      void queryClient.invalidateQueries({ queryKey: listKeys.index });
    },
  });
}

export function useUpdateList(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: (payload: Partial<TListPayload>) => listService.updateList(listId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKeys.all }),
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: (listId: string) => listService.deleteList(listId),
    onSuccess: (_, listId) => {
      queryClient.setQueryData<TList[]>(listKeys.index, (lists) => lists?.filter((list) => list.id !== listId));
      queryClient.removeQueries({ queryKey: listKeys.detail(listId) });
      queryClient.removeQueries({ queryKey: listKeys.entries(listId) });
      return refreshLists(queryClient);
    },
  });
}

export function useAddToList() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: ({ listId, transactionIds }: { listId: string; transactionIds: string[] }) =>
      listService.addEntries(listId, transactionIds),
    onSuccess: () => refreshLists(queryClient),
  });
}

export function useRemoveFromList() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: ({ listId, transactionId }: { listId: string; transactionId: string }) =>
      listService.removeEntry(listId, transactionId),
    onSuccess: () => refreshLists(queryClient),
  });
}

export function useListInvites(listId: string, enabled: boolean) {
  return useQuery({
    queryKey: listKeys.invites(listId),
    queryFn: () => listService.getInvites(listId),
    enabled,
  });
}

export function useCreateInvite(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: (role: InviteRole) => listService.createInvite(listId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKeys.invites(listId) }),
  });
}

export function useEmailInvite(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: (data: { role: InviteRole; email: string; locale: string }) => listService.emailInvite(listId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKeys.invites(listId) }),
  });
}

export function useRevokeInvite(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: (inviteId: string) => listService.revokeInvite(listId, inviteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKeys.invites(listId) }),
  });
}

export function useUpdateMember(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: ({ userId, role }: { userId: string; role: InviteRole }) =>
      listService.updateMember(listId, userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKeys.detail(listId) }),
  });
}

export function useRemoveMember(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: (userId: string) => listService.removeMember(listId, userId),
    onSuccess: () => refreshLists(queryClient),
  });
}

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: listKeys.invite(token),
    queryFn: () => listService.previewInvite(token),
    retry: false,
    gcTime: 0,
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: (token: string) => listService.acceptInvite(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKeys.index }),
  });
}
