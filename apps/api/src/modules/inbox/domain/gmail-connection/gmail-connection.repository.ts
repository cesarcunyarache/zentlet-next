import type { GmailConnection, GmailConnectionData } from './gmail-connection.js';

export abstract class GmailConnectionRepository {
  abstract findByUser(userId: string): Promise<GmailConnection | null>;
  abstract findByEmail(email: string): Promise<GmailConnection | null>;
  abstract findActive(): Promise<GmailConnection[]>;
  abstract save(userId: string, data: GmailConnectionData): Promise<'saved' | 'taken'>;
  abstract markRevoked(id: string): Promise<void>;
  abstract saveProgress(id: string, historyId: bigint): Promise<void>;
  abstract updateWatchExpiry(id: string, watchExpiresAt: Date): Promise<void>;
  abstract deleteById(id: string): Promise<void>;
}
