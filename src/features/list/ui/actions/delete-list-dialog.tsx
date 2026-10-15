"use client";

import { AlertDialog, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

interface DeleteListDialogProps {
  isOpen: boolean;
  listName: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteListDialog({ isOpen, listName, isDeleting, onCancel, onConfirm }: DeleteListDialogProps) {
  const t = useTranslations("lists.deleteDialog");
  const tActions = useTranslations("common.actions");

  return (
    <AlertDialog.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-[400px]">
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger" />
            <AlertDialog.Heading>{t("title")}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p>
              {t.rich("body", { name: listName, strong: (chunks) => <strong>{chunks}</strong> })}
            </p>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button variant="tertiary" onPress={onCancel}>
              {tActions("cancel")}
            </Button>
            <Button variant="danger" onPress={onConfirm} isPending={isDeleting}>
              {t("confirm")}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
