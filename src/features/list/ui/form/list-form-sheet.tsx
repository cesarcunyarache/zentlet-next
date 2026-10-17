"use client";

import { Button, cn } from "@heroui/react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { GhostInput } from "@/features/category/ui/ghost-input";
import { useDeleteConfirmation } from "@/core/hooks/useDeleteConfirmation";
import { useListForm } from "../../hooks/useListForm";
import type { TList, TListPayload } from "../../types";

interface ListFormSheetProps {
  isOpen: boolean;
  list: TList | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: TListPayload) => void;
  onDelete?: () => void;
}

export function ListFormSheet(props: ListFormSheetProps) {
  return <ListFormSheetContent key={props.list?.id ?? "new"} {...props} />;
}

function ListFormSheetContent({
  isOpen,
  list,
  isSaving,
  error,
  onClose,
  onSubmit,
  onDelete,
}: ListFormSheetProps) {
  const t = useTranslations("lists.form");
  const tActions = useTranslations("common.actions");
  const form = useListForm(list);
  const canSave = form.isValid && !isSaving;

  function submit() {
    if (canSave) onSubmit(form.payload);
  }

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={t(list ? "edit" : "new")}
      hideTitle
      bodyClassName="flex flex-col"
      footer={
        <Button
          type="button"
          onPress={submit}
          isDisabled={!canSave}
          className="bg-app-fg text-app-surface disabled:bg-app-fill-strong disabled:text-app-muted min-h-[54px] w-full rounded-2xl text-base font-semibold transition-[background-color,transform] active:scale-[0.98]"
        >
          <Check className="size-[17px]" strokeWidth={2.4} />
          {tActions("save")}
        </Button>
      }
    >
      <form
        className="my-auto flex flex-col gap-6 pt-6 pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <GhostInput
          label={t("nameLabel")}
          value={form.name}
          inputSize="text-4xl sm:text-3xl"
          placeholder={t("namePlaceholder")}
          onChange={form.setName}
        />

        {error ? (
          <p role="alert" className="text-app-expense m-0 text-sm">
            {error}
          </p>
        ) : null}

        {list && onDelete ? <DeleteListButton listId={list.id} onConfirm={onDelete} /> : null}
      </form>
    </Sheet>
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
