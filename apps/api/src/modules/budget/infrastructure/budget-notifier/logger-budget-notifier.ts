import { Injectable } from '@nestjs/common';
import { Logger } from '../../../../shared/logger/domain/logger.js';
import { BudgetNotifier } from '../../domain/budget-notifier.js';
import type { BudgetNotification } from '../../domain/budget-notifier.js';

/**
 * Deliberate stand-in until a real Notification module exists: logs the
 * notice instead of dispatching it anywhere, same spirit as this codebase's
 * other ports that degrade gracefully when unconfigured (email/kv).
 */
@Injectable()
export class LoggerBudgetNotifier extends BudgetNotifier {
  constructor(private readonly logger: Logger) {
    super();
  }

  async notify(notification: BudgetNotification): Promise<void> {
    this.logger.info({ ...notification }, 'budget.notice');
  }
}
