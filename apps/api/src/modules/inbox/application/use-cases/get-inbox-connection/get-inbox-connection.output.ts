import type { EmailInbox } from '../../../domain/email-inbox/email-inbox.js';
import type { GmailConnection } from '../../../domain/gmail-connection/gmail-connection.js';
import type { InboxSender } from '../../../domain/inbox-sender/inbox-sender.js';

export type InboxConnection = {
  isAvailable: boolean;
  inbox: EmailInbox | null;
  visibleSenders: InboxSender[];
  gmail: {
    isAvailable: boolean;
    connection: Pick<GmailConnection, 'email' | 'status'> | null;
  };
};
