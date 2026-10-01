import { useState } from "react";
import { track } from "@/lib/observability/client";
import { useInboxConnection, useInboxConnectionActions } from "../stores/inbox.store";

const COPIED_MS = 2000;

export function useEmailConnection(isOpen: boolean) {
  const connection = useInboxConnection(isOpen);
  const { connect, addSender, removeSender } = useInboxConnectionActions();
  const [senderInput, setSenderInput] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  async function copyAddress() {
    const address = connection.data?.address;
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), COPIED_MS);
    } catch {
      setIsCopied(false);
    }
  }

  function create() {
    connect.mutate(undefined, { onSuccess: () => track("inbox_connected", {}) });
  }

  function submitSender() {
    const address = senderInput.trim();
    if (!address) return;
    addSender.mutate(address, { onSuccess: () => setSenderInput("") });
  }

  return {
    connection: connection.data,
    isLoading: connection.isPending,
    isCreating: connect.isPending,
    hasCreateFailed: connect.isError,
    senderInput,
    setSenderInput,
    isAddingSender: addSender.isPending,
    hasSenderFailed: addSender.isError,
    isCopied,
    copyAddress,
    create,
    submitSender,
    removeSender: (id: string) => removeSender.mutate(id),
  };
}
