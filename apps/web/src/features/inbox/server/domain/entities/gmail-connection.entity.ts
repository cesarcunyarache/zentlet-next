export interface GmailConnection {
  id: string;
  userId: string;
  email: string;
  sealedRefreshToken: string;
  status: string;
  historyId: bigint | null;
  watchExpiresAt: Date | null;
  lastSyncedAt: Date | null;
}

export interface GmailWatch {
  historyId: bigint;
  watchExpiresAt: Date;
}

export interface GmailConnectionData extends GmailWatch {
  email: string;
  sealedRefreshToken: string;
  status: "active";
}

export const isActiveConnection = (connection: Pick<GmailConnection, "status">) => connection.status === "active";
