export type BudgetNotice = { kind: 'exceeded' } | { kind: 'alert'; alertId: string; threshold: number };

export type BudgetNotification = {
  userId: string;
  budgetId: string;
  categoryId: string;
  periodFrom: string;
  spent: number;
  limit: number;
  notice: BudgetNotice;
};

/**
 * No real dispatch channel exists yet in apps/api; the only adapter
 * (`LoggerBudgetNotifier`) just logs the notice until a Notification module
 * lands, same spirit as this codebase's other ports that degrade gracefully
 * when unconfigured (email/kv).
 */
export abstract class BudgetNotifier {
  abstract notify(notification: BudgetNotification): Promise<void>;
}
