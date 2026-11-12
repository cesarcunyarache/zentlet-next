import { Injectable } from '@nestjs/common';
import { Logger } from '../../../shared/logger/domain/logger.js';
import { WhatsappMessenger } from '../domain/whatsapp-messenger/whatsapp-messenger.js';
import { readWhatsappMessengerConfig, type WhatsappMessengerConfig } from './whatsapp.config.js';

const GRAPH_URL = 'https://graph.facebook.com';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_TEXT_LENGTH = 4096;

@Injectable()
export class WhatsappCloudMessenger extends WhatsappMessenger {
  private readonly config: WhatsappMessengerConfig | null;

  constructor(private readonly logger: Logger) {
    super();
    this.config = readWhatsappMessengerConfig();
  }

  async send(phone: string, text: string): Promise<void> {
    if (!this.config) {
      this.logger.warn({ phone }, 'whatsapp.messenger_not_configured');
      return;
    }

    const response = await fetch(`${GRAPH_URL}/${this.config.graphVersion}/${this.config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { body: text.slice(0, MAX_TEXT_LENGTH), preview_url: false },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) throw new Error(`WhatsApp send failed with ${response.status}: ${await response.text()}`);
  }
}
