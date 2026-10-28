"use client";

import { useTranslations } from "next-intl";
import { useDeleteConfirmation } from "@/core/hooks/useDeleteConfirmation";
import type { InviteRole, TListMember } from "../../types";
import { MemberAvatar } from "./member-avatar";

interface MemberRowProps {
  member: TListMember;
  isSelf: boolean;
  canManage: boolean;
  isBusy: boolean;
  onRoleChange: (role: InviteRole) => void;
  onRemove: () => void;
}

export function MemberRow({ member, isSelf, canManage, isBusy, onRoleChange, onRemove }: MemberRowProps) {
  const t = useTranslations("lists");
  const { isConfirming, requestConfirmation } = useDeleteConfirmation(member.userId);
  const isManageable = canManage && !isSelf && member.role !== "owner";
  const nextRole: InviteRole = member.role === "editor" ? "viewer" : "editor";

  return (
    <li className="flex items-center gap-3 py-2.5">
      <MemberAvatar name={member.name} image={member.image} className="size-10 text-sm" />
      <span className="min-w-0 flex-1">
        <span className="text-app-fg block truncate text-[15px] font-semibold">
          {isSelf ? t("share.you") : member.name}
        </span>
        <span className="text-app-muted block text-xs">{t(`roles.${member.role}`)}</span>
      </span>
      {isManageable ? (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRoleChange(nextRole)}
            className="bg-app-fill hover:bg-app-fill-strong text-app-fg min-h-9 rounded-full px-3 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {t(nextRole === "editor" ? "share.makeEditor" : "share.makeViewer")}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => (isConfirming ? onRemove() : requestConfirmation())}
            className={
              isConfirming
                ? "bg-app-expense text-app-surface min-h-9 rounded-full px-3 text-xs font-semibold disabled:opacity-50"
                : "text-app-expense min-h-9 rounded-full px-3 text-xs font-semibold disabled:opacity-50"
            }
          >
            {t(isConfirming ? "share.confirmRemove" : "share.remove")}
          </button>
        </span>
      ) : null}
    </li>
  );
}
