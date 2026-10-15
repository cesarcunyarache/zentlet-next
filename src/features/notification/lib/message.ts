import { currencySymbol } from "@/features/preference/lib/currency";
import { formatMoney } from "@/lib/money";
import type { BudgetNoticeData, NotificationPayloads, NotificationType } from "../types";

type MessageInput = { [Type in NotificationType]: { type: Type; data: NotificationPayloads[Type] } }[NotificationType];

const PERCENT = 100;

function budgetValues({ categoryName, currency, spent, limit }: BudgetNoticeData) {
  const symbol = currencySymbol(currency);
  return {
    category: categoryName,
    spent: formatMoney(spent, symbol),
    limit: formatMoney(limit, symbol),
    percent: Math.round((spent / limit) * PERCENT),
  };
}

function messageValues(notification: MessageInput): Record<string, string | number> {
  switch (notification.type) {
    case "budget.alert":
    case "budget.exceeded":
      return budgetValues(notification.data);
    case "list.joined":
      return { list: notification.data.listName, member: notification.data.memberName };
    case "list.owned":
      return { list: notification.data.listName };
  }
}

export function notificationMessage(notification: MessageInput) {
  return {
    title: `types.${notification.type}.title`,
    body: `types.${notification.type}.body`,
    values: messageValues(notification),
  } as const;
}
