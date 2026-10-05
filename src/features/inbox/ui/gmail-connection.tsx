"use client";

import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { KNOWN_BANKS } from "../lib/banks";
import type { useEmailConnection } from "../hooks/useEmailConnection";
import type { TGmailConnection } from "../types";

interface GmailConnectionProps {
  gmail: TGmailConnection;
  email: ReturnType<typeof useEmailConnection>;
}

export function GmailConnection({ gmail, email }: GmailConnectionProps) {
  const t = useTranslations("inbox.connection.gmail");
  const banks = KNOWN_BANKS.map((bank) => bank.name).join(", ");

  if (!gmail.email) {
    return (
      <section className="flex flex-col gap-2">
        <p className="text-app-muted m-0 text-xs leading-relaxed">{t("pitch")}</p>
        <button
          type="button"
          onClick={email.connectGmail}
          className="bg-app-fg text-app-surface inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl text-sm font-semibold"
        >
          <Mail className="size-4" aria-hidden />
          {t("connect")}
        </button>
        <p className="text-app-muted m-0 text-[11px] leading-relaxed">{t("privacy", { banks })}</p>
      </section>
    );
  }

  const isRevoked = gmail.status === "revoked";

  return (
    <section className="flex flex-col gap-2">
      <div className="bg-app-fill flex items-center gap-2 rounded-2xl p-3">
        <Mail className="text-app-fg size-4 shrink-0" aria-hidden />
        <span className="text-app-fg min-w-0 flex-1 truncate text-[13px] font-semibold">
          {t(isRevoked ? "revokedAs" : "connectedAs", { email: gmail.email })}
        </span>
        <button
          type="button"
          onClick={email.disconnectGmail}
          disabled={email.isDisconnectingGmail}
          className="bg-app-surface text-app-fg min-h-8 shrink-0 rounded-full px-3 text-xs font-semibold disabled:opacity-50"
        >
          {t(email.isDisconnectingGmail ? "disconnecting" : "disconnect")}
        </button>
      </div>
      {isRevoked ? (
        <div className="bg-app-fill flex flex-col gap-2 rounded-2xl p-3 text-xs">
          <p className="text-app-muted m-0 leading-relaxed">{t("revoked")}</p>
          <button
            type="button"
            onClick={email.connectGmail}
            className="bg-app-fg text-app-surface min-h-9 rounded-xl text-xs font-semibold"
          >
            {t("reconnect")}
          </button>
        </div>
      ) : (
        <p className="text-app-muted m-0 text-xs leading-relaxed">{t("listening", { banks })}</p>
      )}
      {email.hasDisconnectGmailFailed ? (
        <p role="alert" className="text-app-expense m-0 text-xs">
          {t("disconnectFailed")}
        </p>
      ) : null}
    </section>
  );
}
