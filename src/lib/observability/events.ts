import type { SpeechError } from "@/features/transaction/hooks/use-speech-recognition";
import type { TransactionType } from "@/features/transaction/types";

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
    source: "form" | "voice";
    type: TransactionType;
    /** La categoría la eligió la app (texto o IA) y el usuario la mantuvo. */
    category_auto: boolean;
  };
  transaction_deleted: Record<string, never>;
  category_created: { ai_suggested: boolean };
  category_updated: Record<string, never>;
  voice_entry_started: Record<string, never>;
  voice_entry_completed: { outcome: "saved" | "edited" };
  voice_entry_failed: { reason: SpeechError };
  data_exported: Record<string, never>;
}

export type AnalyticsEvent = keyof AnalyticsEvents;

export type AuthMethod = "email" | "google" | "github" | "unknown";
