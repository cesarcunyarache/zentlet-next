import { useEffect } from "react";
import { useCreateWhatsappLinkCode, useUnlinkWhatsapp, useWhatsappConnection } from "../stores/whatsapp.store";

export function useWhatsappLink() {
  const createCode = useCreateWhatsappLinkCode();
  const linkCode = createCode.data ?? null;
  const connection = useWhatsappConnection(linkCode !== null);
  const unlink = useUnlinkWhatsapp();
  const isLinked = Boolean(connection.data?.phone);
  const { reset } = createCode;

  useEffect(() => {
    if (!linkCode) return;
    const remainingMs = new Date(linkCode.expiresAt).getTime() - Date.now();
    const timer = setTimeout(reset, Math.max(remainingMs, 0));
    return () => clearTimeout(timer);
  }, [linkCode, reset]);

  useEffect(() => {
    if (isLinked && linkCode) reset();
  }, [isLinked, linkCode, reset]);

  return {
    connection: connection.data ?? null,
    isLoading: connection.isPending,
    linkCode,
    createCode: () => createCode.mutate(),
    isCreatingCode: createCode.isPending,
    hasCodeFailed: createCode.isError,
    unlink: () => unlink.mutate(),
    isUnlinking: unlink.isPending,
    hasUnlinkFailed: unlink.isError,
  };
}
