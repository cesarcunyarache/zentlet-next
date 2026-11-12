export type Notification = {
  id: string;
  userId: string;
  type: string;
  data: Record<string, unknown>;
  dedupeKey: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export type CreateNotificationInput = {
  userId: string;
  type: string;
  data: Record<string, unknown>;
  dedupeKey: string | null;
};
