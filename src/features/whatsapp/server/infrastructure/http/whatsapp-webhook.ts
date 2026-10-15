import { safeEqual } from "@/lib/crypto";
import { logger } from "@/lib/observability/logger";
import { reportError } from "@/lib/observability/server";
import { hasValidSignature, incomingMessages } from "../../../lib/incoming";
import { whatsappWebhookSchema } from "../../../schemas/whatsapp-webhook.schema";
import type { IncomingMessage } from "../../../types";
import { whatsappConfig, whatsappUseCases } from "../whatsapp.container";

const MAX_PAYLOAD_BYTES = 1024 * 1024;

export type WebhookReceipt = IncomingMessage[] | "unavailable" | "unauthorized";

export function verifySubscription(params: URLSearchParams): string | null | "unavailable" {
  if (!whatsappConfig) return "unavailable";
  const isSubscription = params.get("hub.mode") === "subscribe";
  if (!isSubscription || !safeEqual(whatsappConfig.verifyToken, params.get("hub.verify_token"))) return null;
  return params.get("hub.challenge") ?? "";
}

export function receiveWebhook(rawBody: string, signature: string | null): WebhookReceipt {
  if (!whatsappConfig) return "unavailable";
  if (rawBody.length > MAX_PAYLOAD_BYTES || !hasValidSignature(rawBody, signature, whatsappConfig.appSecret))
    return "unauthorized";

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return [];
  }
  const parsed = whatsappWebhookSchema.safeParse(payload);
  return parsed.success ? incomingMessages(parsed.data, whatsappConfig.phoneNumberId) : [];
}

export async function processMessages(messages: IncomingMessage[]) {
  const handler = whatsappUseCases.handleMessage;
  if (!handler) return;
  for (const message of messages) {
    try {
      const outcome = await handler.execute(message);
      logger.info({ kind: message.kind, outcome }, "whatsapp.message_handled");
    } catch (error) {
      reportError(error, "whatsapp.message_failed", { kind: message.kind });
    }
  }
}
