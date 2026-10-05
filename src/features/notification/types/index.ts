import type { CurrencyCode } from "@/features/preference/lib/currency";

export type NotificationChannel = "email";

export type BudgetNoticeData = {
  budgetId: string;
  categoryName: string;
  currency: CurrencyCode;
  spent: number;
  limit: number;
  periodFrom: string;
};

export interface NotificationPayloads {
  "budget.alert": BudgetNoticeData;
  "budget.exceeded": BudgetNoticeData;
}

export type NotificationType = keyof NotificationPayloads;

export type NotificationInput = {
  [Type in NotificationType]: { type: Type; userId: string; data: NotificationPayloads[Type]; dedupeKey: string };
}[NotificationType];

export type TNotification = {
  [Type in NotificationType]: {
    id: string;
    type: Type;
    data: NotificationPayloads[Type];
    readAt: string | null;
    createdAt: string;
  };
}[NotificationType];

export interface NotificationFeed {
  items: TNotification[];
  unreadCount: number;
}

export interface NotificationText {
  title: string;
  body: string;
}
