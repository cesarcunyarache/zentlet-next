-- DropIndex: prefijo del índice compuesto (userId, transactionDate, createdAt, id)
DROP INDEX "transaction_userId_idx";

-- DropIndex: ninguna query filtra por fecha sin userId
DROP INDEX "transaction_transactionDate_idx";

-- Importes siempre positivos. NOT VALID: se exige a filas nuevas y
-- modificadas sin revisar (ni bloquear) las existentes.
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_amount_positive" CHECK ("amount" > 0) NOT VALID;
ALTER TABLE "budget_limit" ADD CONSTRAINT "budget_limit_amount_positive" CHECK ("amount" > 0) NOT VALID;
