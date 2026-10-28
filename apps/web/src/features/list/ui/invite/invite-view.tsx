"use client";

import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { Link, useRouter } from "@/i18n/navigation";
import { track } from "@/lib/observability/client";
import { siteConfig } from "@/lib/site";
import { listErrorKey } from "../../lib/errors";
import { useAcceptInvite, useInvitePreview } from "../../stores/list.store";
import type { TInvitePreview } from "../../types";

const PRIMARY_BUTTON =
  "bg-app-fg text-app-surface flex min-h-[54px] w-full items-center justify-center rounded-2xl text-base font-semibold transition-transform active:scale-[0.98] disabled:opacity-60";

export function InviteView({ token }: { token: string }) {
  const t = useTranslations("lists.invite");
  const { data: preview, isLoading, isError } = useInvitePreview(token);

  return (
    <div className="app-shell bg-app-bg text-app-fg flex min-h-dvh items-center justify-center px-5">
      <main className="flex w-full max-w-sm flex-col items-center text-center">
        {isLoading ? (
          <span aria-hidden className="bg-app-fill size-24 animate-pulse rounded-[28px]" />
        ) : isError || !preview ? (
          <>
            <p className="text-app-muted m-0 text-sm text-balance">{t("invalid")}</p>
            <Link href={siteConfig.routes.app} className={`${PRIMARY_BUTTON} mt-8`}>
              {t("home")}
            </Link>
          </>
        ) : (
          <InviteCard token={token} preview={preview} />
        )}
      </main>
    </div>
  );
}

function InviteCard({ token, preview }: { token: string; preview: TInvitePreview }) {
  const t = useTranslations("lists");
  const router = useRouter();
  const accept = useAcceptInvite();
  const listHref = `${siteConfig.routes.lists}/${preview.listId}`;

  function join() {
    accept.mutate(token, {
      onSuccess: ({ listId, joined }) => {
        if (joined) track("list_joined", { role: preview.role });
        router.replace(`${siteConfig.routes.lists}/${listId}`);
      },
    });
  }

  return (
    <>
      <p className="text-app-muted m-0 text-sm">{t("invite.from", { owner: preview.ownerName })}</p>
      <CategoryEmoji category={preview} className="mt-5 size-24 rounded-[28px] text-[44px]" />
      <h1 className="font-display m-0 mt-5 text-[30px] leading-tight font-bold tracking-[-0.03em]">{preview.name}</h1>
      <p className="text-app-muted m-0 mt-2 flex items-center gap-1.5 text-sm">
        <Users className="size-4" aria-hidden />
        {t("invite.people", { count: preview.memberCount })} · {preview.currency}
      </p>

      {preview.isMember ? (
        <>
          <p className="text-app-muted m-0 mt-8 text-sm">{t("invite.alreadyMember")}</p>
          <Link href={listHref} className={`${PRIMARY_BUTTON} mt-4`}>
            {t("invite.open")}
          </Link>
        </>
      ) : (
        <>
          <p className="bg-app-fill text-app-fg m-0 mt-8 rounded-full px-3.5 py-1.5 text-[13px] font-semibold">
            {t("invite.role", { role: t(`roles.${preview.role}`) })}
          </p>
          {preview.role === "editor" ? (
            <p className="text-app-muted m-0 mt-3 text-xs text-balance">{t("privacy")}</p>
          ) : null}
          {accept.isError ? (
            <p role="alert" className="text-app-expense m-0 mt-4 text-sm">
              {t(`errors.${listErrorKey(accept.error)}`, { currency: preview.currency })}
            </p>
          ) : null}
          <button type="button" disabled={accept.isPending} onClick={join} className={`${PRIMARY_BUTTON} mt-6`}>
            {t("invite.join")}
          </button>
          <Link href={siteConfig.routes.app} className="text-app-muted mt-3 min-h-11 content-center text-sm font-semibold">
            {t("invite.home")}
          </Link>
        </>
      )}
    </>
  );
}
