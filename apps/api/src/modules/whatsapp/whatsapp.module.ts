import { Module } from '@nestjs/common';
import { CategoryModule } from '../category/category.module.js';
import { TransactionModule } from '../transaction/transaction.module.js';
import { ConsumeLinkCodeUseCase } from './application/use-cases/consume-link-code/consume-link-code.use-case.js';
import { GenerateLinkCodeUseCase } from './application/use-cases/generate-link-code/generate-link-code.use-case.js';
import { HandleIncomingMessageUseCase } from './application/use-cases/handle-incoming-message/handle-incoming-message.use-case.js';
import { UnlinkWhatsappUseCase } from './application/use-cases/unlink-whatsapp/unlink-whatsapp.use-case.js';
import { WhatsappLedger } from './domain/whatsapp-ledger/whatsapp-ledger.js';
import { WhatsappLinkCodeRepository } from './domain/whatsapp-link-code/whatsapp-link-code.repository.js';
import { WhatsappLinkRepository } from './domain/whatsapp-link/whatsapp-link.repository.js';
import { WhatsappMessageRepository } from './domain/whatsapp-message/whatsapp-message.repository.js';
import { WhatsappMessenger } from './domain/whatsapp-messenger/whatsapp-messenger.js';
import { PrismaWhatsappLinkCodeRepository } from './infrastructure/prisma-whatsapp-link-code.repository.js';
import { PrismaWhatsappLinkRepository } from './infrastructure/prisma-whatsapp-link.repository.js';
import { PrismaWhatsappMessageRepository } from './infrastructure/prisma-whatsapp-message.repository.js';
import { TransactionWhatsappLedger } from './infrastructure/transaction-whatsapp-ledger.js';
import { WhatsappCloudMessenger } from './infrastructure/whatsapp-cloud.messenger.js';

@Module({
  imports: [CategoryModule, TransactionModule],
  providers: [
    GenerateLinkCodeUseCase,
    ConsumeLinkCodeUseCase,
    UnlinkWhatsappUseCase,
    HandleIncomingMessageUseCase,
    { provide: WhatsappLinkRepository, useClass: PrismaWhatsappLinkRepository },
    { provide: WhatsappLinkCodeRepository, useClass: PrismaWhatsappLinkCodeRepository },
    { provide: WhatsappMessageRepository, useClass: PrismaWhatsappMessageRepository },
    { provide: WhatsappMessenger, useClass: WhatsappCloudMessenger },
    { provide: WhatsappLedger, useClass: TransactionWhatsappLedger },
  ],
  exports: [GenerateLinkCodeUseCase, ConsumeLinkCodeUseCase, UnlinkWhatsappUseCase, HandleIncomingMessageUseCase],
})
export class WhatsappModule {}
