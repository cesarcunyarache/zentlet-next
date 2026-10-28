import { GetRecurringTransactionUseCase } from "../application/use-cases/get-recurring-transaction.use-case";
import { MaterializeDueTransactionsUseCase } from "../application/use-cases/materialize-due-transactions.use-case";
import { StartRecurringSeriesUseCase } from "../application/use-cases/start-recurring-series.use-case";
import { StopRecurringTransactionUseCase } from "../application/use-cases/stop-recurring-transaction.use-case";
import { budgetMonitor, localCalendar, privateList, recurringMonitor } from "./recurring.adapters";
import { PrismaRecurringTransactionRepository } from "./persistence/prisma/prisma-recurring-transaction.repository";

const repository = new PrismaRecurringTransactionRepository();

export const recurringUseCases = {
  start: new StartRecurringSeriesUseCase(repository, localCalendar),
  get: new GetRecurringTransactionUseCase(repository),
  stop: new StopRecurringTransactionUseCase(repository),
  materializeDue: new MaterializeDueTransactionsUseCase(
    repository,
    localCalendar,
    privateList,
    budgetMonitor,
    recurringMonitor,
  ),
};
