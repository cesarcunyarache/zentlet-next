import type { EmailInbox } from "./email-inbox.entity";
import type { GmailConnection } from "./gmail-connection.entity";
import type { InboxSender } from "./inbox-sender.entity";

export interface InboxConnection {
  isAvailable: boolean;
  inbox: EmailInbox | null;
  visibleSenders: InboxSender[];
  gmail: {
    isAvailable: boolean;
    connection: Pick<GmailConnection, "email" | "status"> | null;
  };
}
