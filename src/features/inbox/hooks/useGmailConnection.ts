import { inboxService } from "../services/inbox.service";
import { useDisconnectGmail } from "../stores/inbox.store";

export function useGmailConnection() {
  const disconnect = useDisconnectGmail();

  return {
    connect: () => window.location.assign(inboxService.gmailConnectUrl()),
    disconnect: () => disconnect.mutate(),
    isDisconnecting: disconnect.isPending,
    hasDisconnectFailed: disconnect.isError,
  };
}
