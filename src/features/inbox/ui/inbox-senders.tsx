"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useInboxSenders } from "../hooks/useInboxSenders";
import type { TInboxSender } from "../types";

export function InboxSenders({ senders }: { senders: TInboxSender[] }) {
  const t = useTranslations("inbox.connection");
  const sendersForm = useInboxSenders();

  return (
    <div className="flex flex-col gap-2">
      <span className="text-app-fg text-xs font-semibold">{t("senders")}</span>
      <p className="text-app-muted m-0 text-xs">{t("sendersHint")}</p>
      {senders.length ? (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {senders.map((sender) => (
            <li
              key={sender.id}
              className="bg-app-fill text-app-fg flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-xs font-semibold"
            >
              <span className={sender.status === "blocked" ? "text-app-muted line-through" : undefined}>
                {sender.address}
              </span>
              <button
                type="button"
                onClick={() => sendersForm.removeSender(sender.id)}
                aria-label={t(sender.status === "blocked" ? "unblock" : "remove", { sender: sender.address })}
                className="hover:bg-app-fill-strong grid size-6 place-items-center rounded-full"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          sendersForm.submitSender();
        }}
      >
        <input
          value={sendersForm.senderInput}
          onChange={(event) => sendersForm.setSenderInput(event.target.value)}
          placeholder={t("senderPlaceholder")}
          aria-label={t("senderPlaceholder")}
          className="bg-app-fill text-app-fg min-w-0 flex-1 rounded-xl px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={sendersForm.isAddingSender || !sendersForm.senderInput.trim()}
          aria-label={t("addSender")}
          className="bg-app-fg text-app-surface grid size-9 shrink-0 place-items-center rounded-full disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </form>
      {sendersForm.hasSenderFailed ? (
        <p role="alert" className="text-app-expense m-0 text-xs">
          {t("senderFailed")}
        </p>
      ) : null}
    </div>
  );
}
