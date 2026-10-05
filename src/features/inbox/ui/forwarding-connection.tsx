"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { KNOWN_BANKS } from "../lib/banks";
import type { useEmailConnection } from "../hooks/useEmailConnection";
import type { TInboxConnection } from "../types";

const STEPS = ["copy", "gmail", "filter", "done"] as const;

interface ForwardingConnectionProps {
  connection: TInboxConnection;
  email: ReturnType<typeof useEmailConnection>;
}

export function ForwardingConnection({ connection, email }: ForwardingConnectionProps) {
  const t = useTranslations("inbox.connection");

  if (!connection.address) {
    return (
      <div className="flex flex-col gap-2">
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
    <div className="flex flex-col gap-4">
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
    </div>
  );
}
