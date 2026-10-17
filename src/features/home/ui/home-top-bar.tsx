"use client";

import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { SyncStatusPill } from "@/core/offline/sync-status";
import { InboxIcon } from "@/features/inbox/ui/inbox-icon";
import { NotificationBell } from "@/features/notification/ui/notification-bell";
import type { HomeSheet } from "../hooks/useHomeSheets";
import { IconButton } from "./icon-button";

interface HomeTopBarProps {
  pendingInboxCount: number;
  unreadNotifications: number;
  onOpen: (sheet: HomeSheet) => void;
}

export function HomeTopBar({ pendingInboxCount, unreadNotifications, onOpen }: HomeTopBarProps) {
  const t = useTranslations();
  const hasInboxItems = pendingInboxCount > 0;

  return (
    <div className="flex h-11 items-center justify-between">
      <SyncStatusPill />
      <div className="flex items-center">
        {hasInboxItems ? (
          <IconButton label={t("inbox.label", { count: pendingInboxCount })} onClick={() => onOpen("inbox")}>
            <InboxIcon count={pendingInboxCount} />
          </IconButton>
        ) : null}
        <IconButton
          label={t("notifications.label", { count: unreadNotifications })}
          onClick={() => onOpen("notifications")}
        >
          <NotificationBell hasUnread={unreadNotifications > 0} />
        </IconButton>
        <IconButton label={t("transactions.home.settings")} onClick={() => onOpen("settings")}>
          <Settings className="size-5" strokeWidth={1.7} />
        </IconButton>
      </div>
    </div>
  );
}
