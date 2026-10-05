import { Bell } from "lucide-react";

export function NotificationBell({ hasUnread }: { hasUnread: boolean }) {
  return (
    <span className="relative grid place-items-center">
      <Bell className="size-5" strokeWidth={1.7} />
      {hasUnread ? (
        <span aria-hidden className="bg-app-expense ring-app-bg absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2" />
      ) : null}
    </span>
  );
}
