"use client";

import { cn } from "@heroui/react";
import { CircleAlert, TrendingUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { dayLabel, toISODate } from "@/lib/dates";
import { notificationMessage } from "../lib/message";
import type { NotificationType, TNotification } from "../types";

const ICONS: Record<NotificationType, typeof CircleAlert> = {
  "budget.alert": TrendingUp,
  "budget.exceeded": CircleAlert,
};

const ICON_TONE: Record<NotificationType, string> = {
  "budget.alert": "bg-app-fill text-app-fg",
  "budget.exceeded": "bg-app-expense-soft text-app-expense",
};

export function NotificationItem({ notification }: { notification: TNotification }) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const { title, body, values } = notificationMessage(notification);
  const Icon = ICONS[notification.type];

  return (
    <li className="flex items-start gap-3.5 py-3">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", ICON_TONE[notification.type])}>
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-app-fg block text-[14.5px] font-semibold">{t(title, values)}</span>
        <span className="text-app-muted mt-px block text-[13px]">{t(body, values)}</span>
        <span className="text-app-muted mt-1 block text-xs">
          {dayLabel(toISODate(new Date(notification.createdAt)), locale)}
        </span>
      </span>
      {notification.readAt ? null : <span aria-hidden className="bg-app-expense mt-2 size-2 shrink-0 rounded-full" />}
    </li>
  );
}
