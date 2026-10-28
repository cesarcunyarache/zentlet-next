import { logger } from "@/lib/observability/logger";
import type { MediaFile, Reply } from "../../../types";
import type { WhatsappMessenger } from "../../domain/ports/whatsapp.ports";
import type { WhatsappConfig } from "../whatsapp.config";

const GRAPH_URL = "https://graph.facebook.com";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_MEDIA_BYTES = 5_000_000;
const MAX_BODY_LENGTH = 1024;
const MAX_TEXT_LENGTH = 4096;
const MAX_BUTTON_TITLE = 20;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function messageBody(reply: Reply) {
  switch (reply.kind) {
    case "text":
      return { type: "text", text: { body: clip(reply.text, MAX_TEXT_LENGTH), preview_url: false } };
    case "buttons":
      return {
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: clip(reply.text, MAX_BODY_LENGTH) },
          action: {
            buttons: reply.buttons.map((button) => ({
              type: "reply",
              reply: { id: button.id, title: clip(button.title, MAX_BUTTON_TITLE) },
            })),
          },
        },
      };
    case "list":
      return {
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: clip(reply.text, MAX_BODY_LENGTH) },
          action: {
            button: clip(reply.button, MAX_BUTTON_TITLE),
            sections: [{ rows: reply.rows }],
          },
        },
      };
  }
}

export class WhatsappCloudMessenger implements WhatsappMessenger {
  constructor(private readonly config: WhatsappConfig) {}

  private url(path: string) {
    return `${GRAPH_URL}/${this.config.graphVersion}/${path}`;
  }

  private request(url: string, init: RequestInit = {}) {
    return fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${this.config.accessToken}`, "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }

  private postMessage(payload: Record<string, unknown>) {
    return this.request(this.url(`${this.config.phoneNumberId}/messages`), {
      method: "POST",
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    });
  }

  async send(to: string, reply: Reply) {
    const response = await this.postMessage({ recipient_type: "individual", to, ...messageBody(reply) });
    if (!response.ok) throw new Error(`WhatsApp send failed with ${response.status}: ${await response.text()}`);
  }

  async markRead(messageId: string) {
    try {
      await this.postMessage({ status: "read", message_id: messageId, typing_indicator: { type: "text" } });
    } catch (error) {
      logger.warn({ err: error }, "whatsapp.mark_read_failed");
    }
  }

  async downloadMedia(mediaId: string): Promise<MediaFile | null> {
    try {
      const meta = await this.request(this.url(mediaId));
      if (!meta.ok) return null;
      const { url, mime_type: mimeType, file_size: size } = (await meta.json()) as {
        url?: string;
        mime_type?: string;
        file_size?: number;
      };
      if (!url || !mimeType || (size ?? 0) > MAX_MEDIA_BYTES) return null;

      const file = await this.request(url);
      if (!file.ok) return null;
      const data = new Uint8Array(await file.arrayBuffer());
      if (data.byteLength === 0 || data.byteLength > MAX_MEDIA_BYTES) return null;
      return { data, mediaType: mimeType.split(";")[0].trim() };
    } catch (error) {
      logger.warn({ err: error }, "whatsapp.media_download_failed");
      return null;
    }
  }
}
