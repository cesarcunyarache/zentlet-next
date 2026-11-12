import { Module } from '@nestjs/common';
import { MaterializeDueTransactionsUseCase } from './application/use-cases/materialize-due-transactions/materialize-due-transactions.use-case.js';
import { StartRecurringSeriesUseCase } from './application/use-cases/start-recurring-series/start-recurring-series.use-case.js';
import { StopRecurringTransactionUseCase } from './application/use-cases/stop-recurring-transaction/stop-recurring-transaction.use-case.js';
import { RecurringTransactionRepository } from './domain/recurring-transaction/recurring-transaction.repository.js';
import { PrismaRecurringTransactionRepository } from './infrastructure/recurring-transaction/prisma-recurring-transaction.repository.js';

@Module({
  providers: [
    StartRecurringSeriesUseCase,
    MaterializeDueTransactionsUseCase,
    StopRecurringTransactionUseCase,
    { provide: RecurringTransactionRepository, useClass: PrismaRecurringTransactionRepository },
  ],
  exports: [StartRecurringSeriesUseCase, MaterializeDueTransactionsUseCase, StopRecurringTransactionUseCase],
})
export class RecurringModule {}
