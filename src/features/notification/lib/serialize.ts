import type { TNotification } from "../types";

interface NotificationRow {
  id: string;
  type: string;
  data: unknown;
  readAt: Date | null;
  createdAt: Date;
}

export const NOTIFICATION_FIELDS = { id: true, type: true, data: true, readAt: true, createdAt: true } as const;

export function serializeNotification(row: NotificationRow): TNotification {
  return {
    id: row.id,
    type: row.type,
    data: row.data,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  } as TNotification;
}
