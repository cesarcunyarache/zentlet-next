import type { SpeechError } from "@/features/transaction/types";
import type { ReceiptError } from "@/features/transaction/lib/receipt/receipt-draft";
import type { ReceiptMethod } from "@/features/transaction/lib/receipt/read-receipt";
import type { TransactionType } from "@/features/transaction/types";
import type { FeedbackType } from "@/features/feedback/constants";
import type { BudgetKind, BudgetPeriod } from "@/features/budget/types";

/*
 * Taxonomía de product analytics: `objeto_acción` en pasado.
 *
 * Las propiedades son sólo enums y booleanos: nunca importes, descripciones,
 * nombres de categoría, emails ni texto libre. Es información financiera
 * personal y analytics no la necesita para medir el uso.
 */
export interface AnalyticsEvents {
  user_signed_up: { method: AuthMethod };
  login_completed: { method: AuthMethod };
  transaction_created: {
    source: "form" | "voice" | "receipt" | "email";
    type: TransactionType;
    /** La categoría la eligió la app (texto o IA) y el usuario la mantuvo. */
    category_auto: boolean;
  };
  transaction_updated: { category_changed: boolean; type_changed: boolean };
  transaction_deleted: Record<string, never>;
  category_created: { ai_suggested: boolean };
  category_updated: Record<string, never>;
  budget_saved: { created: boolean; period: BudgetPeriod; kind: BudgetKind };
  budget_deleted: Record<string, never>;
  voice_entry_started: Record<string, never>;
  voice_entry_completed: { outcome: "saved" | "edited" };
  voice_entry_failed: { reason: SpeechError };
  receipt_scan_started: Record<string, never>;
  receipt_scan_completed: { outcome: "saved" | "edited"; method: ReceiptMethod };
  receipt_scan_failed: { reason: ReceiptError };
  inbox_connected: Record<string, never>;
  inbox_item_accepted: { edited: boolean; learned: boolean };
  inbox_item_dismissed: { duplicate: boolean };
  data_exported: Record<string, never>;
  feedback_sent: { type: FeedbackType };
  onboarding_completed: { skipped: boolean; step: number; next: "categories" | "app" };
  checkout_started: { plan: string };
  subscription_canceled: Record<string, never>;
}

export type AnalyticsEvent = keyof AnalyticsEvents;

export type AuthMethod = "email" | "google" | "github" | "unknown";
