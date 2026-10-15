"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { track } from "@/lib/observability/client";
import { listErrorKey } from "../../lib/errors";
import { useEmailInvite } from "../../stores/list.store";
import type { InviteRole, TListDetail } from "../../types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailInviteFormProps {
  list: TListDetail;
  role: InviteRole;
  onToast: (message: string) => void;
}

export function EmailInviteForm({ list, role, onToast }: EmailInviteFormProps) {
  const t = useTranslations("lists");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const send = useEmailInvite(list.id);
  const trimmed = email.trim();
  const isValid = EMAIL_PATTERN.test(trimmed);

  return (
    <form
      className="mt-3 flex flex-col gap-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isValid || send.isPending) return;
        send.mutate(
          { role, email: trimmed, locale },
          {
            onSuccess: () => {
              track("list_invite_created", { role });
              onToast(t("toast.emailSent", { email: trimmed }));
              setEmail("");
            },
            onError: (error) => onToast(t(`errors.${listErrorKey(error)}`, { currency: list.currency })),
          },
        );
      }}
    >
      <label className="bg-app-fill flex items-center gap-2 rounded-2xl px-3.5">
        <Mail className="text-app-muted size-4 shrink-0" aria-hidden />
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("share.emailPlaceholder")}
          aria-label={t("share.emailLabel")}
          className="placeholder:text-app-muted h-12 min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={!isValid || send.isPending}
        className="bg-app-fg text-app-surface disabled:bg-app-fill-strong disabled:text-app-muted flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold transition-transform active:scale-[0.98]"
      >
        {t("share.sendEmail")}
      </button>
      <p className="text-app-muted m-0 text-xs">{t("share.emailHint")}</p>
    </form>
  );
}
