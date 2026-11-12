import { Module } from '@nestjs/common';
import { EmailIngestionService } from './application/services/email-ingestion.service.js';
import { GmailAccessService } from './application/services/gmail-access.service.js';
import { GmailSyncService } from './application/services/gmail-sync.service.js';
import { AcceptInboxTransactionUseCase } from './application/use-cases/accept-inbox-transaction/accept-inbox-transaction.use-case.js';
import { CompleteGmailConnectUseCase } from './application/use-cases/complete-gmail-connect/complete-gmail-connect.use-case.js';
import { CreateEmailInboxUseCase } from './application/use-cases/create-email-inbox/create-email-inbox.use-case.js';
import { DisconnectGmailUseCase } from './application/use-cases/disconnect-gmail/disconnect-gmail.use-case.js';
import { DismissInboxTransactionUseCase } from './application/use-cases/dismiss-inbox-transaction/dismiss-inbox-transaction.use-case.js';
import { GetInboxConnectionUseCase } from './application/use-cases/get-inbox-connection/get-inbox-connection.use-case.js';
import { ListPendingInboxTransactionsUseCase } from './application/use-cases/list-pending-inbox-transactions/list-pending-inbox-transactions.use-case.js';
import { ReceiveInboundEmailUseCase } from './application/use-cases/receive-inbound-email/receive-inbound-email.use-case.js';
import { RemoveInboxSenderUseCase } from './application/use-cases/remove-inbox-sender/remove-inbox-sender.use-case.js';
import { RenewGmailWatchesUseCase } from './application/use-cases/renew-gmail-watches/renew-gmail-watches.use-case.js';
import { StartGmailConnectUseCase } from './application/use-cases/start-gmail-connect/start-gmail-connect.use-case.js';
import { SyncGmailPushUseCase } from './application/use-cases/sync-gmail-push/sync-gmail-push.use-case.js';
import { TrustInboxSenderUseCase } from './application/use-cases/trust-inbox-sender/trust-inbox-sender.use-case.js';
import { EmailInboxRepository } from './domain/email-inbox/email-inbox.repository.js';
import { GmailClient } from './domain/gmail-client.js';
import { GmailConnectionRepository } from './domain/gmail-connection/gmail-connection.repository.js';
import { InboundMailbox } from './domain/inbound-mailbox.js';
import { InboxSenderRepository } from './domain/inbox-sender/inbox-sender.repository.js';
import { InboxTransactionRepository } from './domain/inbox-transaction/inbox-transaction.repository.js';
import { MerchantRuleRepository } from './domain/merchant-rule/merchant-rule.repository.js';
import { TokenCipher } from './domain/token-cipher.js';
import { UserCalendar } from './domain/user-calendar.js';
import { PrismaEmailInboxRepository } from './infrastructure/email-inbox/prisma-email-inbox.repository.js';
import { FetchGmailClient } from './infrastructure/gmail/gmail-client.adapter.js';
import { PrismaGmailConnectionRepository } from './infrastructure/gmail-connection/prisma-gmail-connection.repository.js';
import { EnvInboundMailbox } from './infrastructure/inbound-mailbox.adapter.js';
import { PrismaInboxSenderRepository } from './infrastructure/inbox-sender/prisma-inbox-sender.repository.js';
import { PrismaInboxTransactionRepository } from './infrastructure/inbox-transaction/prisma-inbox-transaction.repository.js';
import { PrismaMerchantRuleRepository } from './infrastructure/merchant-rule/prisma-merchant-rule.repository.js';
import { AesTokenCipher } from './infrastructure/token-cipher.adapter.js';
import { UtcUserCalendar } from './infrastructure/user-calendar.adapter.js';

@Module({
  providers: [
    EmailIngestionService,
    GmailAccessService,
    GmailSyncService,
    ListPendingInboxTransactionsUseCase,
    AcceptInboxTransactionUseCase,
    DismissInboxTransactionUseCase,
    TrustInboxSenderUseCase,
    RemoveInboxSenderUseCase,
    CreateEmailInboxUseCase,
    GetInboxConnectionUseCase,
    ReceiveInboundEmailUseCase,
    StartGmailConnectUseCase,
    CompleteGmailConnectUseCase,
    DisconnectGmailUseCase,
    SyncGmailPushUseCase,
    RenewGmailWatchesUseCase,
    { provide: EmailInboxRepository, useClass: PrismaEmailInboxRepository },
    { provide: GmailConnectionRepository, useClass: PrismaGmailConnectionRepository },
    { provide: InboxSenderRepository, useClass: PrismaInboxSenderRepository },
    { provide: InboxTransactionRepository, useClass: PrismaInboxTransactionRepository },
    { provide: MerchantRuleRepository, useClass: PrismaMerchantRuleRepository },
    { provide: GmailClient, useClass: FetchGmailClient },
    { provide: TokenCipher, useClass: AesTokenCipher },
    { provide: InboundMailbox, useClass: EnvInboundMailbox },
    { provide: UserCalendar, useClass: UtcUserCalendar },
  ],
  exports: [
    ListPendingInboxTransactionsUseCase,
    AcceptInboxTransactionUseCase,
    DismissInboxTransactionUseCase,
    TrustInboxSenderUseCase,
    RemoveInboxSenderUseCase,
    CreateEmailInboxUseCase,
    GetInboxConnectionUseCase,
    ReceiveInboundEmailUseCase,
    StartGmailConnectUseCase,
    CompleteGmailConnectUseCase,
    DisconnectGmailUseCase,
    SyncGmailPushUseCase,
    RenewGmailWatchesUseCase,
  ],
})
export class InboxModule {}
