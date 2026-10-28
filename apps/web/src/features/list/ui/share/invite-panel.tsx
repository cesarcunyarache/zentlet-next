"use client";

import { useState } from "react";
import { cn } from "@heroui/react";
import { Copy, Link2, Share2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { fullDate, toISODate } from "@/lib/dates";
import { track } from "@/lib/observability/client";
import { useInviteLink } from "../../hooks/useInviteLink";
import { listErrorKey } from "../../lib/errors";
import { useCreateInvite, useListInvites, useRevokeInvite } from "../../stores/list.store";
import { EmailInviteForm } from "./email-invite-form";
import type { InviteRole, TListDetail } from "../../types";

const ROLES: InviteRole[] = ["editor", "viewer"];

type InviteMethod = "link" | "email";

const METHODS: InviteMethod[] = ["link", "email"];

interface InvitePanelProps {
  list: TListDetail;
  onToast: (message: string) => void;
}

export function InvitePanel({ list, onToast }: InvitePanelProps) {
  const t = useTranslations("lists");
  const locale = useLocale();
  const [role, setRole] = useState<InviteRole>("editor");
  const [method, setMethod] = useState<InviteMethod>("link");
  const invites = useListInvites(list.id, true);
  const create = useCreateInvite(list.id);
  const revoke = useRevokeInvite(list.id);
  const invite = useInviteLink();

  function createLink() {
    create.mutate(role, {
      onSuccess: (created) => {
        track("list_invite_created", { role });
        invite.show(created.token);
      },
      onError: (error) => onToast(t(`errors.${listErrorKey(error)}`, { currency: list.currency })),
    });
  }

  async function copy() {
    if (await invite.copy()) onToast(t("share.copied"));
  }

  return (
    <section className="mt-6">
      <h3 className="text-app-muted m-0 mb-2 text-[13px] font-normal">{t("share.invite")}</h3>

      <Segmented
        label={t("share.inviteAs")}
        options={ROLES}
        value={role}
        labelOf={(option) => t(`roles.${option}`)}
        onChange={(option) => {
          setRole(option);
          invite.reset();
        }}
      />
      <Segmented
        className="mt-2"
        label={t("share.invite")}
        options={METHODS}
        value={method}
        labelOf={(option) => t(option === "link" ? "share.byLink" : "share.byEmail")}
        onChange={setMethod}
      />

      {method === "email" ? (
        <EmailInviteForm list={list} role={role} onToast={onToast} />
      ) : invite.link ? (
        <div className="bg-app-fill mt-3 flex flex-col gap-2.5 rounded-2xl p-3.5">
          <p className="text-app-fg m-0 truncate font-mono text-xs">{invite.link}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copy}
              className="bg-app-fg text-app-surface flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold"
            >
              <Copy className="size-4" aria-hidden />
              {t("share.copy")}
            </button>
            {invite.canShare ? (
              <button
                type="button"
                onClick={() => void invite.share(t("share.inviteText", { name: list.name }))}
                className="bg-app-surface text-app-fg flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold"
              >
                <Share2 className="size-4" aria-hidden />
                {t("share.send")}
              </button>
            ) : null}
          </div>
          <p className="text-app-muted m-0 text-xs">{t("share.linkHint")}</p>
        </div>
      ) : (
        <button
          type="button"
          disabled={create.isPending}
          onClick={createLink}
          className="bg-app-fg text-app-surface mt-3 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <Link2 className="size-5" aria-hidden />
          {t("share.createLink")}
        </button>
      )}

      {invites.data && invites.data.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-app-muted m-0 mb-1 text-[13px] font-normal">{t("share.pending")}</h3>
          <ul className="m-0 list-none p-0">
            {invites.data.map((pending) => (
              <li key={pending.id} className="border-app-border flex items-center gap-3 border-b py-2.5 last:border-b-0">
                <span className="min-w-0 flex-1">
                  <span className="text-app-fg block truncate text-sm font-semibold">
                    {pending.email ? t("share.sentTo", { email: pending.email }) : t(`roles.${pending.role}`)}
                  </span>
                  <span className="text-app-muted block text-xs">
                    {pending.email ? `${t(`roles.${pending.role}`)} · ` : null}
                    {t("share.expires", { date: fullDate(toISODate(new Date(pending.expiresAt)), locale) })}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(pending.id)}
                  className="text-app-expense min-h-9 rounded-full px-3 text-xs font-semibold disabled:opacity-50"
                >
                  {t("share.revoke")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  options: T[];
  value: T;
  labelOf: (option: T) => string;
  onChange: (option: T) => void;
  className?: string;
}

function Segmented<T extends string>({ label, options, value, labelOf, onChange, className }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("bg-app-fill flex gap-0.5 rounded-full p-[3px]", className)}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "min-h-9 flex-1 rounded-full text-[13px] font-semibold transition-colors",
            value === option ? "bg-app-surface text-app-fg shadow-sm" : "text-app-muted",
          )}
        >
          {labelOf(option)}
        </button>
      ))}
    </div>
  );
}
