"use client";

import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { deleteAccountErrorKey, hasCredentialAccount, type DeleteAccountErrorKey } from "../lib/delete-account";

interface UseDeleteAccountOptions {
  isOpen: boolean;
  onCancel: () => void;
  onDeleted: () => Promise<void>;
}

export function useDeleteAccount({ isOpen, onCancel, onDeleted }: UseDeleteAccountOptions) {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [error, setError] = useState<DeleteAccountErrorKey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    authClient
      .listAccounts()
      .then(({ data, error: listError }) => {
        if (isCancelled) return;
        if (listError) return setError("fallback");
        setHasPassword(hasCredentialAccount(data));
      })
      .catch(() => !isCancelled && setError("fallback"));
    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  function cancel() {
    setError(null);
    onCancel();
  }

  function failDeletion(key: DeleteAccountErrorKey) {
    setError(key);
    setIsDeleting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = hasPassword ? String(new FormData(event.currentTarget).get("password")) : undefined;
    setIsDeleting(true);
    setError(null);

    try {
      const { error: deleteError } = await authClient.deleteUser({ password });
      if (deleteError) return failDeletion(deleteAccountErrorKey(deleteError.code));
      await onDeleted();
    } catch {
      failDeletion("fallback");
    }
  }

  return { hasPassword, error, isDeleting, cancel, handleSubmit };
}
