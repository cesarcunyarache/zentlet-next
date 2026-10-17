import { SubscriptionLifecycle } from "../application/services/subscription-lifecycle.service";
import { CancelUserSubscriptionUseCase } from "../application/use-cases/cancel-user-subscription.use-case";
import { GetBillingSummaryUseCase } from "../application/use-cases/get-billing-summary.use-case";
import { GetEffectivePlanUseCase } from "../application/use-cases/get-effective-plan.use-case";
import { HandleWebhookUseCase } from "../application/use-cases/handle-webhook.use-case";
import { HasFeatureUseCase } from "../application/use-cases/has-feature.use-case";
import { ReconcileSubscriptionsUseCase } from "../application/use-cases/reconcile-subscriptions.use-case";
import { RecordPaymentUseCase } from "../application/use-cases/record-payment.use-case";
import { RefundPaymentUseCase } from "../application/use-cases/refund-payment.use-case";
import { StartCheckoutUseCase } from "../application/use-cases/start-checkout.use-case";
import { SyncUserSubscriptionUseCase } from "../application/use-cases/sync-user-subscription.use-case";
import { billingMonitor, billingProviders, planCache, testGrant } from "./billing.adapters";
import { PrismaBillingEventRepository } from "./persistence/prisma/prisma-billing-event.repository";
import { PrismaPaymentRepository } from "./persistence/prisma/prisma-payment.repository";
import { PrismaSubscriptionRepository } from "./persistence/prisma/prisma-subscription.repository";

const subscriptions = new PrismaSubscriptionRepository();
const payments = new PrismaPaymentRepository();
const events = new PrismaBillingEventRepository();

const lifecycle = new SubscriptionLifecycle(subscriptions, payments, events, billingProviders, planCache);
const getEffectivePlan = new GetEffectivePlanUseCase(subscriptions, planCache, testGrant);
const recordPayment = new RecordPaymentUseCase(subscriptions, payments, billingProviders, lifecycle);

export const billingUseCases = {
  getSummary: new GetBillingSummaryUseCase(subscriptions, testGrant),
  getEffectivePlan,
  hasFeature: new HasFeatureUseCase(getEffectivePlan),
  startCheckout: new StartCheckoutUseCase(subscriptions, billingProviders, events, lifecycle),
  cancelUserSubscription: new CancelUserSubscriptionUseCase(subscriptions, lifecycle),
  syncUserSubscription: new SyncUserSubscriptionUseCase(subscriptions, lifecycle),
  refundPayment: new RefundPaymentUseCase(payments, billingProviders, events, lifecycle),
  handleWebhook: new HandleWebhookUseCase(billingProviders, events, subscriptions, lifecycle, recordPayment, billingMonitor),
  reconcile: new ReconcileSubscriptionsUseCase(subscriptions, lifecycle, billingMonitor),
};
