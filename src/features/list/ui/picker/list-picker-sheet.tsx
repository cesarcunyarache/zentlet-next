"use client";

import { useState } from "react";
import { cn } from "@heroui/react";
import { Check, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import type { TTransaction } from "@/features/transaction/types";
import { track } from "@/lib/observability/client";
import { useListName } from "../../hooks/useListName";
import { listErrorKey } from "../../lib/errors";
import { useAddToList, useCreateList, useLists, useRemoveFromList } from "../../stores/list.store";
import type { TList, TListPayload } from "../../types";
import { ListFormSheet } from "../form/list-form-sheet";

interface ListPickerSheetProps {
  transaction: TTransaction | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

export function ListPickerSheet({ transaction, onClose, onDone }: ListPickerSheetProps) {
  const t = useTranslations("lists");
  const { lists, isLoading } = useLists();
  const listName = useListName();
  const add = useAddToList();
  const remove = useRemoveFromList();
  const create = useCreateList();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const writable = lists.filter((list) => list.role !== "viewer");
  const isBusy = add.isPending || remove.isPending || create.isPending;

  function fail(cause: unknown, list?: TList) {
    setError(t(`errors.${listErrorKey(cause)}`, { currency: list?.currency ?? "" }));
  }

  function moveTo(list: TList) {
    if (!transaction || list.id === transaction.listId) return;
    add.mutate(
      { listId: list.id, transactionIds: [transaction.id] },
      {
        onSuccess: () => {
          track("list_entries_added", { count: 1, source: "transaction" });
          finish(t("toast.moved", { name: listName(list) }));
        },
        onError: (cause) => fail(cause, list),
      },
    );
  }

  function removeFromCurrent() {
    if (!transaction?.listId) return;
    remove.mutate(
      { listId: transaction.listId, transactionId: transaction.id },
      {
        onSuccess: () => {
          track("list_entry_removed", {});
          finish(t("toast.removed"));
        },
        onError: (cause) => fail(cause),
      },
    );
  }

  function createAndMove(payload: TListPayload) {
    create.mutate(payload, {
      onSuccess: (created) => {
        track("list_created", {});
        setIsCreating(false);
        moveTo(created);
      },
    });
  }

  function finish(message: string) {
    setError(null);
    onDone(message);
  }

  function close() {
    setError(null);
    setIsCreating(false);
    onClose();
  }

  return (
    <>
      <Sheet
        isOpen={Boolean(transaction) && !isCreating}
        onOpenChange={(open) => !open && close()}
        title={t("picker.title")}
      >
        {!isLoading && writable.length === 0 ? (
          <p className="text-app-muted m-0 py-6 text-center text-sm">{t("picker.empty")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {writable.map((list) => {
              const isCurrent = list.id === transaction?.listId;
              return (
                <li key={list.id}>
                  <button
                    type="button"
                    disabled={isBusy}
                    aria-pressed={isCurrent}
                    onClick={() => moveTo(list)}
                    className={cn(
                      "flex w-full items-center gap-3.5 rounded-2xl px-1.5 py-2.5 text-left transition-colors disabled:opacity-60",
                      isCurrent ? "bg-app-fill" : "hover:bg-app-fill",
                    )}
                  >
                    <CategoryEmoji category={list} className="size-11 rounded-2xl text-xl" />
                    <span className="min-w-0 flex-1">
                      <span className="text-app-fg block truncate text-base font-semibold">{listName(list)}</span>
                      {list.memberCount > 1 ? <span className="text-app-muted block text-xs">{t("shared")}</span> : null}
                    </span>
                    {isCurrent ? <Check className="text-app-fg size-5 shrink-0" strokeWidth={2.4} /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {writable.some((list) => list.memberCount > 1) ? (
          <p className="text-app-muted m-0 mt-3 text-center text-xs text-balance">{t("privacy")}</p>
        ) : null}

        {error ? (
          <p role="alert" className="text-app-expense m-0 mt-3 text-center text-sm">
            {error}
          </p>
        ) : null}

        <div className="mt-5 mb-2 flex flex-col gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              create.reset();
              setIsCreating(true);
            }}
            className="bg-app-fill text-app-fg hover:bg-app-fill-strong flex min-h-[50px] items-center justify-center gap-2 rounded-2xl text-base font-semibold transition-colors disabled:opacity-60"
          >
            <Plus className="size-5" strokeWidth={2.2} aria-hidden />
            {t("create")}
          </button>
          {transaction?.listId && !lists.find((list) => list.id === transaction.listId)?.isPrivate ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={removeFromCurrent}
              className="text-app-expense min-h-11 rounded-2xl text-sm font-semibold disabled:opacity-60"
            >
              {t("picker.remove")}
            </button>
          ) : null}
        </div>
      </Sheet>

      <ListFormSheet
        isOpen={Boolean(transaction) && isCreating}
        list={null}
        isSaving={create.isPending || add.isPending}
        error={create.isError ? t("errors.generic") : null}
        onClose={() => setIsCreating(false)}
        onSubmit={createAndMove}
      />
    </>
  );
}
