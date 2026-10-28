"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { useWhatsappLink } from "../hooks/useWhatsappLink";

type WhatsappLink = ReturnType<typeof useWhatsappLink>;

function LinkedPhone({ phone, whatsapp }: { phone: string; whatsapp: WhatsappLink }) {
  const t = useTranslations("settings.whatsapp");

  return (
    <section className="flex flex-col gap-2">
      <div className="bg-app-fill flex items-center gap-2 rounded-2xl p-3">
        <MessageCircle className="text-app-fg size-4 shrink-0" aria-hidden />
        <span className="text-app-fg min-w-0 flex-1 truncate text-[13px] font-semibold">
          {t("connectedAs", { phone: `+${phone}` })}
        </span>
        <button
          type="button"
          onClick={whatsapp.unlink}
          disabled={whatsapp.isUnlinking}
          className="bg-app-surface text-app-fg min-h-8 shrink-0 rounded-full px-3 text-xs font-semibold disabled:opacity-50"
        >
          {t(whatsapp.isUnlinking ? "disconnecting" : "disconnect")}
        </button>
      </div>
      <p className="text-app-muted m-0 text-xs leading-relaxed">{t("usage")}</p>
      {whatsapp.hasUnlinkFailed ? (
        <p role="alert" className="text-app-expense m-0 text-xs">
          {t("disconnectFailed")}
        </p>
      ) : null}
    </section>
  );
}

function PendingCode({ code, url }: { code: string; url: string }) {
  const t = useTranslations("settings.whatsapp");

  return (
    <section className="flex flex-col gap-2">
      <p className="text-app-muted m-0 text-xs leading-relaxed">{t("openHint")}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-app-fg text-app-surface inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl text-sm font-semibold"
      >
        <MessageCircle className="size-4" aria-hidden />
        {t("open")}
      </a>
      <p className="text-app-muted m-0 text-[11px] leading-relaxed">{t("manual", { command: `vincular ${code}` })}</p>
      <p role="status" className="text-app-fg m-0 text-xs font-semibold">
        {t("waiting")}
      </p>
    </section>
  );
}

function ConnectPrompt({ whatsapp }: { whatsapp: WhatsappLink }) {
  const t = useTranslations("settings.whatsapp");

  return (
    <section className="flex flex-col gap-2">
      <p className="text-app-muted m-0 text-xs leading-relaxed">{t("pitch")}</p>
      <button
        type="button"
        onClick={whatsapp.createCode}
        disabled={whatsapp.isCreatingCode}
        className="bg-app-fg text-app-surface inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl text-sm font-semibold disabled:opacity-50"
      >
        <MessageCircle className="size-4" aria-hidden />
        {t(whatsapp.isCreatingCode ? "connecting" : "connect")}
      </button>
      {whatsapp.hasCodeFailed ? (
        <p role="alert" className="text-app-expense m-0 text-xs">
          {t("connectFailed")}
        </p>
      ) : null}
      <p className="text-app-muted m-0 text-[11px] leading-relaxed">{t("privacy")}</p>
    </section>
  );
}

export function WhatsappConnectionPanel({ whatsapp }: { whatsapp: WhatsappLink }) {
  const phone = whatsapp.connection?.phone;

  return (
    <div className="py-3">
      {phone ? (
        <LinkedPhone phone={phone} whatsapp={whatsapp} />
      ) : whatsapp.linkCode ? (
        <PendingCode code={whatsapp.linkCode.code} url={whatsapp.linkCode.url} />
      ) : (
        <ConnectPrompt whatsapp={whatsapp} />
      )}
    </div>
  );
}
