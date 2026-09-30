import { currencySymbol } from "@/features/preference/lib/currency";
import { formatMoney } from "@/lib/money";
import type { BudgetNoticeData, TNotification } from "../types";

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

export function notificationMessage(notification: Pick<TNotification, "type" | "data">) {
  return {
    title: `types.${notification.type}.title`,
    body: `types.${notification.type}.body`,
    values: budgetValues(notification.data),
  } as const;
}
