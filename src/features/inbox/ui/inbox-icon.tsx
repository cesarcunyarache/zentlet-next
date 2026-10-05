"use client";

import { Inbox } from "lucide-react";

export function InboxIcon({ count }: { count: number }) {
  return (
    <span className="relative grid place-items-center">
      <Inbox className="size-5" strokeWidth={1.7} />
      {count > 0 ? (
        <span
          aria-hidden
          className="bg-app-expense text-app-surface ring-app-bg absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold tabular-nums ring-2"
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </span>
  );
}
