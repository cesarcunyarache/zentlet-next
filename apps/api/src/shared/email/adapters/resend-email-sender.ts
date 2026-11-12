import { EmailSender, type Email } from '../types.js';

const API_URL = 'https://api.resend.com';
const SEND_TIMEOUT_MS = 10_000;

export class ResendEmailSender extends EmailSender {
  readonly name = 'resend';

  constructor(private readonly apiKey: string) {
    super();
  }

  async send(email: Email, from: string): Promise<void> {
    const response = await fetch(`${API_URL}/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: email.to, subject: email.subject, html: email.html, text: email.text }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Email provider responded ${response.status}`);
  }
}
