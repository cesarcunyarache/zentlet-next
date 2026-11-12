import { Module } from '@nestjs/common';
import { TransactionModule } from '../transaction/transaction.module.js';
import { CheckBudgetUseCase } from './application/use-cases/check-budget/check-budget.use-case.js';
import { CreateBudgetUseCase } from './application/use-cases/create-budget/create-budget.use-case.js';
import { GetBudgetUseCase } from './application/use-cases/get-budget/get-budget.use-case.js';
import { ReplaceBudgetAlertsUseCase } from './application/use-cases/replace-budget-alerts/replace-budget-alerts.use-case.js';
import { SetBudgetLimitUseCase } from './application/use-cases/set-budget-limit/set-budget-limit.use-case.js';
import { BudgetRepository } from './domain/budget/budget.repository.js';
import { BudgetAlertRepository } from './domain/budget-alert/budget-alert.repository.js';
import { BudgetLimitRepository } from './domain/budget-limit/budget-limit.repository.js';
import { BudgetNotifier } from './domain/budget-notifier.js';
import { PrismaBudgetRepository } from './infrastructure/budget/prisma-budget.repository.js';
import { PrismaBudgetAlertRepository } from './infrastructure/budget-alert/prisma-budget-alert.repository.js';
import { PrismaBudgetLimitRepository } from './infrastructure/budget-limit/prisma-budget-limit.repository.js';
import { LoggerBudgetNotifier } from './infrastructure/budget-notifier/logger-budget-notifier.js';

@Module({
  imports: [TransactionModule],
  providers: [
    CreateBudgetUseCase,
    SetBudgetLimitUseCase,
    ReplaceBudgetAlertsUseCase,
    GetBudgetUseCase,
    CheckBudgetUseCase,
    { provide: BudgetRepository, useClass: PrismaBudgetRepository },
    { provide: BudgetLimitRepository, useClass: PrismaBudgetLimitRepository },
    { provide: BudgetAlertRepository, useClass: PrismaBudgetAlertRepository },
    { provide: BudgetNotifier, useClass: LoggerBudgetNotifier },
  ],
  exports: [CreateBudgetUseCase, SetBudgetLimitUseCase, ReplaceBudgetAlertsUseCase, GetBudgetUseCase, CheckBudgetUseCase],
})
export class BudgetModule {}
