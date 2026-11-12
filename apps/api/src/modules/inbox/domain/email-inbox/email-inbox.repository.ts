import type { EmailInbox, EmailVerification } from './email-inbox.js';

export abstract class EmailInboxRepository {
  abstract findByUser(userId: string): Promise<EmailInbox | null>;
  abstract findByAddresses(addresses: string[]): Promise<EmailInbox | null>;
  abstract insert(userId: string, address: string): Promise<EmailInbox | 'conflict'>;
  abstract recordReceipt(id: string, receivedAt: Date, verification: EmailVerification | null): Promise<void>;
}
