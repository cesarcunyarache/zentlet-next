export type NotifyInput = {
  userId: string;
  type: string;
  data: Record<string, unknown>;
  // null when this notification should never be deduplicated against others.
  dedupeKey: string | null;
  channels: string[];
};
