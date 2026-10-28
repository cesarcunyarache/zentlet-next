export interface LocalCalendar {
  today(userId: string, at?: Date): Promise<string>;
}

export interface PrivateList {
  idFor(userId: string): Promise<string>;
}

export interface BudgetMonitor {
  scheduleCheck(userId: string, categoryId: string): void;
}

export interface RecurringMonitor {
  materializeFailed(userId: string, error: unknown): void;
}
