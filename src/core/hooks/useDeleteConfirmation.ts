import { useEffect, useState } from "react";

const CONFIRMATION_TIMEOUT_MS = 3500;

export function useDeleteConfirmation(transactionId: string | undefined) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState(transactionId);

  if (transactionId !== lastTransactionId) {
    setLastTransactionId(transactionId);
    setIsConfirming(false);
  }

  useEffect(() => {
    if (!isConfirming) return;
    const timer = setTimeout(() => setIsConfirming(false), CONFIRMATION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isConfirming]);

  function requestConfirmation() {
    setIsConfirming(true);
  }

  return { isConfirming, requestConfirmation };
}
