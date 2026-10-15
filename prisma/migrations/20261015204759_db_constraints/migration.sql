-- Restricciones que Prisma no genera desde el schema y que se perdieron al
-- consolidar las migraciones. Copiadas de 20260929120000_billing_subscriptions
-- y 20260930200239_feature_flag_rollout.

-- Importes siempre positivos. NOT VALID: se exige a filas nuevas y
-- modificadas sin revisar (ni bloquear) las existentes.
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_amount_positive" CHECK ("amount" > 0) NOT VALID;
ALTER TABLE "budget_limit" ADD CONSTRAINT "budget_limit_amount_positive" CHECK ("amount" > 0) NOT VALID;

CREATE UNIQUE INDEX "subscription_one_live_per_user" ON "subscription"("userId") WHERE "status" IN ('pending', 'trialing', 'active', 'past_due');

ALTER TABLE "subscription" ADD CONSTRAINT "subscription_status_check" CHECK ("status" IN ('pending', 'trialing', 'active', 'past_due', 'canceled'));
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "billing_payment" ADD CONSTRAINT "billing_payment_status_check" CHECK ("status" IN ('pending', 'approved', 'failed', 'refunded', 'partially_refunded'));
ALTER TABLE "billing_payment" ADD CONSTRAINT "billing_payment_refund_range" CHECK ("refundedAmount" >= 0 AND "refundedAmount" <= "amount");

-- AddCheckConstraint
ALTER TABLE "feature" ADD CONSTRAINT "feature_rollout_range" CHECK ("rollout" BETWEEN 0 AND 100);
