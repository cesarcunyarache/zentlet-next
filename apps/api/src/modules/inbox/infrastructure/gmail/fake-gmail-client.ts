import { vi } from 'vitest';
import { GmailClient } from '../../domain/gmail-client.js';

export class FakeGmailClient extends GmailClient {
  isAvailable = vi.fn<GmailClient['isAvailable']>().mockReturnValue(true);
  authorizeUrl = vi.fn<GmailClient['authorizeUrl']>((state: string) => `https://accounts.google.com?state=${state}`);
  exchangeCode = vi.fn<GmailClient['exchangeCode']>().mockResolvedValue({ accessToken: 'access-1', refreshToken: 'refresh-1', canReadInbox: true });
  refreshAccessToken = vi.fn<GmailClient['refreshAccessToken']>().mockResolvedValue({ accessToken: 'access-2' });
  revokeToken = vi.fn<GmailClient['revokeToken']>();
  getProfile = vi.fn<GmailClient['getProfile']>().mockResolvedValue({ emailAddress: 'cesar@gmail.com', historyId: '900' });
  watch = vi.fn<GmailClient['watch']>().mockResolvedValue({ historyId: BigInt(1000), watchExpiresAt: new Date('2026-10-23') });
  stopWatch = vi.fn<GmailClient['stopWatch']>();
  listHistory = vi.fn<GmailClient['listHistory']>().mockResolvedValue({ historyId: '1100', history: [] });
  getMessageSender = vi.fn<GmailClient['getMessageSender']>().mockResolvedValue(null);
  getMessage = vi.fn<GmailClient['getMessage']>().mockResolvedValue(null);
}
