import type { NotificationInput } from "@/features/notification/types";
import type { CurrencyCode } from "@/features/preference/lib/currency";

export interface BudgetMonitor {
  scheduleCheck(userId: string, categoryId: string): void;
}

export interface ListPlacement {
  accepts(userId: string, listId: string): Promise<boolean>;
}

export interface AccountPreferences {
  find(userId: string): Promise<{ currency: CurrencyCode; timezone: string }>;
}

export interface BudgetNotifier {
  sentKeys(userId: string, prefix: string): Promise<string[]>;
  notify(notification: NotificationInput): Promise<unknown>;
}
