"use client";

import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { useMarkNotificationsRead, useNotifications } from "../stores/notification.store";
import { NotificationItem } from "./notification-item";

interface NotificationSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSheet({ isOpen, onOpenChange }: NotificationSheetProps) {
  const t = useTranslations("notifications");
  const { items, unreadCount } = useNotifications();
  const markAllRead = useMarkNotificationsRead();

  function handleOpenChange(open: boolean) {
    if (!open && unreadCount > 0) markAllRead();
    onOpenChange(open);
  }

  return (
    <Sheet isOpen={isOpen} onOpenChange={handleOpenChange} title={t("title")}>
      {items.length > 0 ? (
        <ul className="divide-app-border flex flex-col divide-y">
          {items.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </ul>
      ) : (
        <p className="text-app-muted py-10 text-center text-sm">{t("empty")}</p>
      )}
    </Sheet>
  );
}
