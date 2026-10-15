import { createHmac } from "node:crypto";
import { safeEqual } from "@/lib/crypto";
import {
  whatsappMessageSchema,
  type WhatsappMessagePayload,
  type WhatsappWebhookPayload,
} from "../schemas/whatsapp-webhook.schema";
import type { IncomingMessage } from "../types";

const SIGNATURE_PREFIX = "sha256=";

export function hasValidSignature(rawBody: string, signature: string | null, appSecret: string) {
  if (!signature?.startsWith(SIGNATURE_PREFIX)) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  return safeEqual(`${SIGNATURE_PREFIX}${expected}`, signature);
}

function toIncoming(message: WhatsappMessagePayload): IncomingMessage {
  const base = { id: message.id, from: message.from };
  const choice = message.interactive?.button_reply ?? message.interactive?.list_reply;

  if (message.type === "text" && message.text) return { ...base, kind: "text", text: message.text.body };
  if (message.type === "interactive" && choice) return { ...base, kind: "choice", choiceId: choice.id };
  if (message.type === "button" && message.button?.payload) return { ...base, kind: "choice", choiceId: message.button.payload };
  if (message.type === "audio" && message.audio) return { ...base, kind: "audio", mediaId: message.audio.id };
  if (message.type === "image" && message.image)
    return { ...base, kind: "image", mediaId: message.image.id, caption: message.image.caption ?? null };
  return { ...base, kind: "unsupported" };
}

export function incomingMessages(payload: WhatsappWebhookPayload, phoneNumberId: string): IncomingMessage[] {
  if (payload.object !== "whatsapp_business_account") return [];
  return payload.entry
    .flatMap((entry) => entry.changes)
    .filter((change) => change.field === "messages" && change.value.metadata?.phone_number_id === phoneNumberId)
    .flatMap((change) => change.value.messages ?? [])
    .flatMap((raw) => {
      const parsed = whatsappMessageSchema.safeParse(raw);
      return parsed.success ? [toIncoming(parsed.data)] : [];
    });
}
