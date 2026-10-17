import type { BillingEventSource } from "../../../types";
import type { Subscription } from "./subscription.entity";

export type BillingEventData = Record<string, string | number | boolean | null>;

export interface NewBillingEvent {
  source: BillingEventSource;
  type: string;
  userId?: string;
  subscriptionId?: string;
  data?: BillingEventData;
}

export interface WebhookEvent {
  id: string;
  processedAt: Date | null;
}

export type WebhookEventOutcome =
  | { kind: "ignored" }
  | { kind: "unmatched" }
  | { kind: "matched"; subscription: Pick<Subscription, "id" | "userId"> };
