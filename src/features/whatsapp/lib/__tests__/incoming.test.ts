import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { whatsappWebhookSchema } from "../../schemas/whatsapp-webhook.schema";
import { hasValidSignature, incomingMessages } from "../incoming";

const SECRET = "app-secret";
const PHONE_NUMBER_ID = "1234567890";

const sign = (body: string, secret = SECRET) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

function payload(messages: unknown[], phoneNumberId = PHONE_NUMBER_ID) {
  return whatsappWebhookSchema.parse({
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: phoneNumberId }, messages } }] }],
  });
}

describe("hasValidSignature", () => {
  it("acepta solo la firma HMAC del cuerpo exacto con el secreto de la app", () => {
    const body = '{"object":"whatsapp_business_account"}';
    expect(hasValidSignature(body, sign(body), SECRET)).toBe(true);
    expect(hasValidSignature(`${body} `, sign(body), SECRET)).toBe(false);
    expect(hasValidSignature(body, sign(body, "otro"), SECRET)).toBe(false);
    expect(hasValidSignature(body, null, SECRET)).toBe(false);
  });
});

describe("incomingMessages", () => {
  it("convierte cada tipo de mensaje", () => {
    const messages = incomingMessages(
      payload([
        { id: "m1", from: "51987654321", type: "text", text: { body: "almuerzo 25" } },
        { id: "m2", from: "51987654321", type: "interactive", interactive: { type: "list_reply", list_reply: { id: "cat:abc", title: "Comida" } } },
        { id: "m3", from: "51987654321", type: "audio", audio: { id: "media-1", mime_type: "audio/ogg; codecs=opus" } },
        { id: "m4", from: "51987654321", type: "image", image: { id: "media-2", caption: "boleta" } },
        { id: "m5", from: "51987654321", type: "sticker", sticker: { id: "media-3" } },
      ]),
      PHONE_NUMBER_ID,
    );

    expect(messages).toEqual([
      { id: "m1", from: "51987654321", kind: "text", text: "almuerzo 25" },
      { id: "m2", from: "51987654321", kind: "choice", choiceId: "cat:abc" },
      { id: "m3", from: "51987654321", kind: "audio", mediaId: "media-1" },
      { id: "m4", from: "51987654321", kind: "image", mediaId: "media-2", caption: "boleta" },
      { id: "m5", from: "51987654321", kind: "unsupported" },
    ]);
  });

  it("ignora otros números del negocio y mensajes mal formados", () => {
    const message = { id: "m1", from: "51987654321", type: "text", text: { body: "hola" } };
    expect(incomingMessages(payload([message], "otro-numero"), PHONE_NUMBER_ID)).toEqual([]);
    expect(incomingMessages(payload([{ id: "m2", from: "no-es-numero", type: "text" }]), PHONE_NUMBER_ID)).toEqual([]);
  });
});
