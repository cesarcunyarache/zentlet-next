import { EmailIngestionService } from "../application/services/email-ingestion.service";
import { GmailAccessService } from "../application/services/gmail-access.service";
import { GmailSyncService } from "../application/services/gmail-sync.service";
import { AcceptInboxItemUseCase } from "../application/use-cases/accept-inbox-item.use-case";
import { CompleteGmailConnectUseCase } from "../application/use-cases/complete-gmail-connect.use-case";
import { CreateInboxConnectionUseCase } from "../application/use-cases/create-inbox-connection.use-case";
import { DisconnectGmailUseCase } from "../application/use-cases/disconnect-gmail.use-case";
import { DismissInboxItemUseCase } from "../application/use-cases/dismiss-inbox-item.use-case";
import { GetInboxConnectionUseCase } from "../application/use-cases/get-inbox-connection.use-case";
import { ListPendingInboxItemsUseCase } from "../application/use-cases/list-pending-inbox-items.use-case";
import { ReceiveInboundEmailUseCase } from "../application/use-cases/receive-inbound-email.use-case";
import { RemoveInboxSenderUseCase } from "../application/use-cases/remove-inbox-sender.use-case";
import { RenewGmailWatchesUseCase } from "../application/use-cases/renew-gmail-watches.use-case";
import { StartGmailConnectUseCase } from "../application/use-cases/start-gmail-connect.use-case";
import { SyncGmailPushUseCase } from "../application/use-cases/sync-gmail-push.use-case";
import { TrustInboxSenderUseCase } from "../application/use-cases/trust-inbox-sender.use-case";
import { gmailGateway } from "./gmail/gmail.gateway";
import { budgetMonitor, inboundMailbox, inboxMonitor, listPlacement, tokenCipher, userCalendar } from "./inbox.adapters";
import { PrismaEmailInboxRepository } from "./persistence/prisma/prisma-email-inbox.repository";
import { PrismaGmailConnectionRepository } from "./persistence/prisma/prisma-gmail-connection.repository";
import { PrismaInboxItemRepository } from "./persistence/prisma/prisma-inbox-item.repository";
import { PrismaInboxSenderRepository } from "./persistence/prisma/prisma-inbox-sender.repository";
import { PrismaMerchantRuleRepository } from "./persistence/prisma/prisma-merchant-rule.repository";

const inboxItemRepository = new PrismaInboxItemRepository();
const inboxSenderRepository = new PrismaInboxSenderRepository();
const emailInboxRepository = new PrismaEmailInboxRepository();
const gmailConnectionRepository = new PrismaGmailConnectionRepository();
const merchantRuleRepository = new PrismaMerchantRuleRepository();

const emailIngestion = new EmailIngestionService(
  inboxItemRepository,
  inboxSenderRepository,
  merchantRuleRepository,
  userCalendar,
);
const gmailAccess = new GmailAccessService(gmailConnectionRepository, gmailGateway, tokenCipher, inboxMonitor);
const gmailSync = new GmailSyncService(
  gmailConnectionRepository,
  inboxSenderRepository,
  gmailGateway,
  gmailAccess,
  emailIngestion,
  inboxMonitor,
);

export const inboxUseCases = {
  listPending: new ListPendingInboxItemsUseCase(inboxItemRepository),
  accept: new AcceptInboxItemUseCase(inboxItemRepository, listPlacement, budgetMonitor),
  dismiss: new DismissInboxItemUseCase(inboxItemRepository, inboxSenderRepository),
  trustSender: new TrustInboxSenderUseCase(inboxSenderRepository),
  removeSender: new RemoveInboxSenderUseCase(inboxSenderRepository),
  getConnection: new GetInboxConnectionUseCase(
    emailInboxRepository,
    inboxSenderRepository,
    gmailConnectionRepository,
    inboundMailbox,
    gmailGateway,
  ),
  createConnection: new CreateInboxConnectionUseCase(emailInboxRepository, inboundMailbox),
  receiveEmail: new ReceiveInboundEmailUseCase(emailInboxRepository, emailIngestion),
  startGmailConnect: new StartGmailConnectUseCase(gmailGateway),
  completeGmailConnect: new CompleteGmailConnectUseCase(
    gmailConnectionRepository,
    gmailGateway,
    gmailAccess,
    tokenCipher,
    inboxMonitor,
  ),
  disconnectGmail: new DisconnectGmailUseCase(gmailAccess),
  syncGmailPush: new SyncGmailPushUseCase(gmailConnectionRepository, gmailSync),
  renewGmailWatches: new RenewGmailWatchesUseCase(
    gmailConnectionRepository,
    gmailGateway,
    gmailAccess,
    gmailSync,
    inboxMonitor,
  ),
};
