import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { BudgetModule } from './modules/budget/budget.module.js';
import { CategoryModule } from './modules/category/category.module.js';
import { FeatureFlagModule } from './modules/feature-flag/feature-flag.module.js';
import { FeedbackModule } from './modules/feedback/feedback.module.js';
import { InboxModule } from './modules/inbox/inbox.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { PreferenceModule } from './modules/preference/preference.module.js';
import { RecurringModule } from './modules/recurring/recurring.module.js';
import { TransactionModule } from './modules/transaction/transaction.module.js';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module.js';
import { AiModule } from './shared/ai/ai.module.js';
import { BackgroundModule } from './shared/background/background.module.js';
import { EmailModule } from './shared/email/email.module.js';
import { KvModule } from './shared/kv/kv.module.js';
import { LoggerModule } from './shared/logger/logger.module.js';
import { PrismaModule } from './shared/prisma/prisma.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'api',
    }),
    LoggerModule,
    PrismaModule,
    EmailModule,
    KvModule,
    BackgroundModule,
    AiModule,
    AuthModule,
    BillingModule,
    CategoryModule,
    TransactionModule,
    BudgetModule,
    RecurringModule,
    FeedbackModule,
    PreferenceModule,
    FeatureFlagModule,
    NotificationModule,
    InboxModule,
    WhatsappModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
