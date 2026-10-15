"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { whatsappService } from "../services/whatsapp.service";
import type { TWhatsappConnection } from "../types";

const whatsappKeys = {
  connection: ["whatsapp", "connection"] as const,
};

const WAITING_POLL_MS = 3_000;

export function useWhatsappConnection(isWaitingForLink = false) {
  return useQuery({
    queryKey: whatsappKeys.connection,
    queryFn: () => whatsappService.getConnection(),
    refetchOnWindowFocus: "always",
    refetchInterval: (query) => (isWaitingForLink && !query.state.data?.phone ? WAITING_POLL_MS : false),
  });
}

export function useCreateWhatsappLinkCode() {
  return useMutation({ mutationFn: () => whatsappService.createLinkCode() });
}

export function useUnlinkWhatsapp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => whatsappService.unlink(),
    onSuccess: (connection: TWhatsappConnection) => queryClient.setQueryData(whatsappKeys.connection, connection),
  });
}
