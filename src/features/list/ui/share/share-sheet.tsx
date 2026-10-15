"use client";

import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { useDeleteConfirmation } from "@/features/transaction/hooks/useDeleteConfirmation";
import { listErrorKey } from "../../lib/errors";
import { useRemoveMember, useUpdateMember } from "../../stores/list.store";
import type { TListDetail } from "../../types";
import { InvitePanel } from "./invite-panel";
import { MemberRow } from "./member-row";

interface ShareSheetProps {
  list: TListDetail;
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLeft: () => void;
  onToast: (message: string) => void;
}

export function ShareSheet({ list, userId, isOpen, onOpenChange, onLeft, onToast }: ShareSheetProps) {
  const t = useTranslations("lists");
  const update = useUpdateMember(list.id);
  const remove = useRemoveMember(list.id);
  const isOwner = list.role === "owner";
  const fail = (error: unknown) => onToast(t(`errors.${listErrorKey(error)}`, { currency: list.currency }));

  return (
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange} title={t("share.title")}>
      <h3 className="text-app-muted m-0 mt-1 text-[13px] font-normal">{t("share.members")}</h3>
      <ul className="m-0 list-none p-0">
        {list.members.map((member) => (
          <MemberRow
            key={member.userId}
            member={member}
            isSelf={member.userId === userId}
            canManage={isOwner}
            isBusy={update.isPending || remove.isPending}
            onRoleChange={(role) =>
              update.mutate(
                { userId: member.userId, role },
                { onSuccess: () => onToast(t("toast.roleUpdated")), onError: fail },
              )
            }
            onRemove={() =>
              remove.mutate(member.userId, { onSuccess: () => onToast(t("toast.memberRemoved")), onError: fail })
            }
          />
        ))}
      </ul>

      {isOwner ? (
        <InvitePanel list={list} onToast={onToast} />
      ) : (
        <LeaveButton
          listId={list.id}
          isBusy={remove.isPending}
          onConfirm={() => remove.mutate(userId, { onSuccess: onLeft, onError: fail })}
        />
      )}
      <div className="h-2" />
    </Sheet>
  );
}

function LeaveButton({ listId, isBusy, onConfirm }: { listId: string; isBusy: boolean; onConfirm: () => void }) {
  const t = useTranslations("lists.share");
  const { isConfirming, requestConfirmation } = useDeleteConfirmation(listId);

  return (
    <div className="mt-6 flex flex-col items-center gap-1.5">
      <button
        type="button"
        disabled={isBusy}
        onClick={() => (isConfirming ? onConfirm() : requestConfirmation())}
        className={cn(
          "min-h-[50px] w-full rounded-2xl text-base font-semibold transition-colors disabled:opacity-50",
          isConfirming ? "bg-app-expense text-app-surface" : "bg-app-expense-soft text-app-expense",
        )}
      >
        {t(isConfirming ? "confirmLeave" : "leave")}
      </button>
      <p className="text-app-muted m-0 text-center text-xs">{t("leaveHint")}</p>
    </div>
  );
}
