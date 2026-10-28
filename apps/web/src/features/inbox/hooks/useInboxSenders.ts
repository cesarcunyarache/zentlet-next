import { useState } from "react";
import { useAddInboxSender, useRemoveInboxSender } from "../stores/inbox.store";

export function useInboxSenders() {
  const addSender = useAddInboxSender();
  const removeSender = useRemoveInboxSender();
  const [senderInput, setSenderInput] = useState("");

  function submitSender() {
    const address = senderInput.trim();
    if (!address) return;
    addSender.mutate(address, { onSuccess: () => setSenderInput("") });
  }

  return {
    senderInput,
    setSenderInput,
    submitSender,
    removeSender: (id: string) => removeSender.mutate(id),
    isAddingSender: addSender.isPending,
    hasSenderFailed: addSender.isError,
  };
}
