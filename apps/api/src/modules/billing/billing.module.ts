import { Module } from '@nestjs/common';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription/cancel-subscription.use-case.js';
import { CreateCheckoutUseCase } from './application/use-cases/create-checkout/create-checkout.use-case.js';
import { GetSubscriptionUseCase } from './application/use-cases/get-subscription/get-subscription.use-case.js';
import { HandleWebhookUseCase } from './application/use-cases/handle-webhook/handle-webhook.use-case.js';
import { RecordPaymentUseCase } from './application/use-cases/record-payment/record-payment.use-case.js';
import { RefundPaymentUseCase } from './application/use-cases/refund-payment/refund-payment.use-case.js';
import { SubscriptionLifecycleService } from './application/services/subscription-lifecycle.service.js';
import { BillingEventRepository } from './domain/billing-event.repository.js';
import { BillingPaymentRepository } from './domain/billing-payment.repository.js';
import { BillingProviderRegistry } from './domain/billing-provider-registry.js';
import { SubscriptionRepository } from './domain/subscription.repository.js';
import { DefaultBillingProviderRegistry } from './infrastructure/default-billing-provider-registry.js';
import { MercadoPagoProvider } from './infrastructure/mercadopago/mercadopago.provider.js';
import { PrismaBillingEventRepository } from './infrastructure/prisma-billing-event.repository.js';
import { PrismaBillingPaymentRepository } from './infrastructure/prisma-billing-payment.repository.js';
import { PrismaSubscriptionRepository } from './infrastructure/prisma-subscription.repository.js';

@Module({
  providers: [
    MercadoPagoProvider,
    SubscriptionLifecycleService,
    CreateCheckoutUseCase,
    HandleWebhookUseCase,
    RecordPaymentUseCase,
    GetSubscriptionUseCase,
    CancelSubscriptionUseCase,
    RefundPaymentUseCase,
    { provide: SubscriptionRepository, useClass: PrismaSubscriptionRepository },
    { provide: BillingPaymentRepository, useClass: PrismaBillingPaymentRepository },
    { provide: BillingEventRepository, useClass: PrismaBillingEventRepository },
    { provide: BillingProviderRegistry, useClass: DefaultBillingProviderRegistry },
  ],
  exports: [
    CreateCheckoutUseCase,
    HandleWebhookUseCase,
    RecordPaymentUseCase,
    GetSubscriptionUseCase,
    CancelSubscriptionUseCase,
    RefundPaymentUseCase,
  ],
})
export class BillingModule {}
