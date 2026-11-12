export type GmailConnection = {
  id: string;
  userId: string;
  email: string;
  sealedRefreshToken: string;
  status: string;
  historyId: bigint | null;
  watchExpiresAt: Date | null;
  lastSyncedAt: Date | null;
};

export type GmailWatch = {
  historyId: bigint;
  watchExpiresAt: Date;
};

export type GmailConnectionData = GmailWatch & {
  email: string;
  sealedRefreshToken: string;
  status: 'active';
};

export const isActiveConnection = (connection: Pick<GmailConnection, 'status'>): boolean => connection.status === 'active';
