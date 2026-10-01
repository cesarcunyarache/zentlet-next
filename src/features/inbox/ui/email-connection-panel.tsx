"use client";

import { Check, Copy, ExternalLink, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { KNOWN_BANKS } from "../lib/banks";
import { useEmailConnection } from "../hooks/useEmailConnection";

const STEPS = ["copy", "gmail", "filter", "done"] as const;

export function EmailConnectionPanel() {
  const t = useTranslations("inbox.connection");
  const email = useEmailConnection(true);
  const { connection } = email;

  if (email.isLoading || !connection) return <p className="text-app-muted py-3 text-xs">{t("loading")}</p>;
  if (!connection.isAvailable) return <p className="text-app-muted py-3 text-xs">{t("unavailable")}</p>;

  if (!connection.address) {
    return (
      <div className="flex flex-col gap-2 py-3">
        <p className="text-app-muted m-0 text-xs leading-relaxed">{t("pitch")}</p>
        <button
          type="button"
          onClick={email.create}
          disabled={email.isCreating}
          className="bg-app-fg text-app-surface min-h-10 rounded-2xl text-sm font-semibold disabled:opacity-50"
        >
          {t(email.isCreating ? "creating" : "create")}
        </button>
        {email.hasCreateFailed ? (
          <p role="alert" className="text-app-expense m-0 text-xs">
            {t("createFailed")}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-3">
      <div className="bg-app-fill flex items-center gap-2 rounded-2xl p-3">
        <code className="text-app-fg min-w-0 flex-1 truncate text-[13px] font-semibold">{connection.address}</code>
        <button
          type="button"
          onClick={email.copyAddress}
          aria-label={t("copy")}
          className="bg-app-surface text-app-fg grid size-8 shrink-0 place-items-center rounded-full"
        >
          {email.isCopied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        </button>
      </div>

      {connection.verificationCode ? (
        <div className="bg-app-income-soft text-app-income flex flex-col gap-1 rounded-2xl p-3 text-xs">
          <span className="font-semibold">{t("gmailCode", { code: connection.verificationCode })}</span>
          {connection.verificationUrl ? (
            <a
              href={connection.verificationUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 font-semibold underline"
            >
              {t("gmailLink")}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : null}
        </div>
      ) : null}

      <ol className="text-app-muted m-0 flex list-decimal flex-col gap-1.5 pl-4 text-xs leading-relaxed">
        {STEPS.map((step) => (
          <li key={step}>{t(`steps.${step}`, { banks: KNOWN_BANKS.map((bank) => bank.name).join(", ") })}</li>
        ))}
      </ol>

      <div className="flex flex-col gap-2">
        <span className="text-app-fg text-xs font-semibold">{t("senders")}</span>
        <p className="text-app-muted m-0 text-xs">{t("sendersHint")}</p>
        {connection.senders.length ? (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {connection.senders.map((sender) => (
              <li
                key={sender.id}
                className="bg-app-fill text-app-fg flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-xs font-semibold"
              >
                <span className={sender.status === "blocked" ? "text-app-muted line-through" : undefined}>
                  {sender.address}
                </span>
                <button
                  type="button"
                  onClick={() => email.removeSender(sender.id)}
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
            email.submitSender();
          }}
        >
          <input
            value={email.senderInput}
            onChange={(event) => email.setSenderInput(event.target.value)}
            placeholder={t("senderPlaceholder")}
            aria-label={t("senderPlaceholder")}
            className="bg-app-fill text-app-fg min-w-0 flex-1 rounded-xl px-3 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={email.isAddingSender || !email.senderInput.trim()}
            aria-label={t("addSender")}
            className="bg-app-fg text-app-surface grid size-9 shrink-0 place-items-center rounded-full disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </form>
        {email.hasSenderFailed ? (
          <p role="alert" className="text-app-expense m-0 text-xs">
            {t("senderFailed")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
