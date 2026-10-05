import { useState } from "react";
import { track } from "@/lib/observability/client";
import { useCreateInboxAddress } from "../stores/inbox.store";

const COPIED_MS = 2000;

export function useForwardingAddress(address: string | null) {
  const createAddress = useCreateInboxAddress();
  const [isCopied, setIsCopied] = useState(false);

  async function copyAddress() {
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
    createAddress.mutate(undefined, { onSuccess: () => track("inbox_connected", {}) });
  }

  return {
    isCopied,
    copyAddress,
    create,
    isCreating: createAddress.isPending,
    hasCreateFailed: createAddress.isError,
  };
}
