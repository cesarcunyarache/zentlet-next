import type { InboxSender } from './inbox-sender.js';

export abstract class InboxSenderRepository {
  abstract findAll(userId: string): Promise<InboxSender[]>;
  abstract findRules(userId: string): Promise<InboxSender[]>;
  abstract trust(userId: string, address: string): Promise<InboxSender>;
  abstract recordAcceptance(userId: string, address: string): Promise<InboxSender>;
  abstract recordDismissal(userId: string, address: string): Promise<InboxSender>;
  abstract block(id: string): Promise<void>;
  abstract deleteOwned(userId: string, id: string): Promise<'deleted' | 'not_found'>;
}
