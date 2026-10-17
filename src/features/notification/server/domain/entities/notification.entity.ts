import type { Locale } from "@/i18n/routing";
import type { TNotification } from "../../../types";

export interface Recipient {
  email: string;
  name: string;
  locale: Locale;
}

export interface ClaimedDelivery {
  id: string;
  channel: string;
  attempts: number;
  notification: TNotification;
  recipient: Recipient;
}

export type DeliveryOutcome =
  | { status: "sent"; sentAt: Date }
  | { status: "failed" }
  | { nextAttemptAt: Date };

export const FEED_SIZE = 50;
export const PENDING_BATCH = 50;
