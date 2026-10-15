"use client";

import { Button, cn } from "@heroui/react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { GhostInput } from "@/features/category/ui/ghost-input";
import { useDeleteConfirmation } from "@/features/transaction/hooks/useDeleteConfirmation";
import { useListForm } from "../../hooks/useListForm";
import type { TList, TListPayload } from "../../types";
import { ListIconGrid } from "./list-icon-grid";

interface ListFormSheetProps {
  isOpen: boolean;
  list: TList | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: TListPayload) => void;
  onDelete?: () => void;
}

export function ListFormSheet({ isOpen, list, isSaving, error, onClose, onSubmit, onDelete }: ListFormSheetProps) {
  const t = useTranslations("lists.form");

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={t(list ? "edit" : "new")}
      hideTitle
      bodyClassName="flex flex-col"
    >
      <div className="my-auto flex flex-col pb-4">
        <ListForm
          key={list?.id ?? "new"}
          list={list}
          isSaving={isSaving}
          error={error}
          onSubmit={onSubmit}
          onDelete={onDelete}
        />
      </div>
    </Sheet>
  );
}

interface ListFormProps {
  list: TList | null;
  isSaving: boolean;
  error: string | null;
  onSubmit: (payload: TListPayload) => void;
  onDelete?: () => void;
}

function ListForm({ list, isSaving, error, onSubmit, onDelete }: ListFormProps) {
  const t = useTranslations("lists.form");
  const tActions = useTranslations("common.actions");
  const form = useListForm(list);

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (form.isValid && !isSaving) onSubmit(form.payload);
      }}
    >
      <CategoryEmoji category={form.icon} className="size-24 rounded-[28px] text-[44px]" />
      <GhostInput
        label={t("nameLabel")}
        value={form.name}
        inputSize="text-4xl sm:text-3xl"
        placeholder={t("namePlaceholder")}
        onChange={form.setName}
      />
      <ListIconGrid value={form.icon} onChange={form.setIcon} />

      {error ? (
        <p role="alert" className="text-app-expense m-0 text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2.5">
        <Button type="submit" className="w-full" isDisabled={!form.isValid || isSaving}>
          <Check />
          {tActions("save")}
        </Button>
        {list && onDelete ? <DeleteListButton listId={list.id} onConfirm={onDelete} /> : null}
      </div>
    </form>
  );
}

function DeleteListButton({ listId, onConfirm }: { listId: string; onConfirm: () => void }) {
  const t = useTranslations("lists.form");
  const { isConfirming, requestConfirmation } = useDeleteConfirmation(listId);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => (isConfirming ? onConfirm() : requestConfirmation())}
        className={cn(
          "min-h-11 w-full rounded-2xl text-sm font-semibold transition-colors",
          isConfirming ? "bg-app-expense text-app-surface" : "text-app-expense",
        )}
      >
        {t(isConfirming ? "confirmDelete" : "delete")}
      </button>
      {isConfirming ? <p className="text-app-muted m-0 text-center text-xs">{t("deleteHint")}</p> : null}
    </div>
  );
}
