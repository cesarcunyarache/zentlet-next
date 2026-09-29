"use client";

import { AlertDialog, Button, Input, Label, TextField } from "@heroui/react";
import { UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDeleteAccount } from "../hooks/useDeleteAccount";

interface DeleteAccountDialogProps {
  isOpen: boolean;
  transactionCount: number;
  onCancel: () => void;
  onDeleted: () => Promise<void>;
}

const PASSWORD_INPUT_ID = "delete-account-password";

export function DeleteAccountDialog({ isOpen, transactionCount, onCancel, onDeleted }: DeleteAccountDialogProps) {
  const t = useTranslations();
  const { hasPassword, error, isDeleting, cancel, handleSubmit } = useDeleteAccount({ isOpen, onCancel, onDeleted });

  return (
    <AlertDialog.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => !open && !isDeleting && cancel()}
      isDismissable={!isDeleting}
      isKeyboardDismissDisabled={isDeleting}
      className="bg-[var(--app-scrim)]"
    >
      <AlertDialog.Container placement="center" size="sm">
        <AlertDialog.Dialog className="bg-app-surface text-app-fg rounded-[28px] p-6 shadow-[var(--shadow-sheet)]">
          <form onSubmit={handleSubmit}>
            <AlertDialog.Header className="flex flex-col items-center gap-3 text-center">
              <span className="bg-app-expense-soft text-app-expense grid size-14 place-items-center rounded-full">
                <UserX className="size-6" strokeWidth={2} aria-hidden />
              </span>
              <AlertDialog.Heading className="font-display m-0 text-xl font-bold tracking-[-0.02em]">
                {t("settings.deleteAccount.title")}
              </AlertDialog.Heading>
            </AlertDialog.Header>

            <AlertDialog.Body className="mt-2 flex flex-col gap-4 text-center">
              <p className="text-app-muted m-0 text-sm leading-relaxed">
                {t("settings.deleteAccount.body", { count: transactionCount })}
                <br />
                {t("settings.deleteAccount.exportHint")}
              </p>

              {hasPassword && (
                <TextField className="text-left">
                  <Label htmlFor={PASSWORD_INPUT_ID}>{t("settings.deleteAccount.password")}</Label>
                  <Input
                    id={PASSWORD_INPUT_ID}
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </TextField>
              )}

              {error && (
                <p role="alert" className="text-app-expense m-0 text-xs font-medium">
                  {t(`settings.deleteAccount.errors.${error}`)}
                </p>
              )}
            </AlertDialog.Body>

            <AlertDialog.Footer className="mt-6 flex gap-2.5">
              <Button
                type="button"
                onPress={cancel}
                isDisabled={isDeleting}
                className="bg-app-fill text-app-fg hover:bg-app-fill-strong min-h-12 flex-1 rounded-2xl font-semibold"
              >
                {t("common.actions.cancel")}
              </Button>
              <Button
                type="submit"
                isPending={isDeleting}
                isDisabled={hasPassword === null}
                className="bg-app-expense text-app-surface min-h-12 flex-1 rounded-2xl font-semibold"
              >
                {t(isDeleting ? "settings.deleteAccount.pending" : "settings.deleteAccount.confirm")}
              </Button>
            </AlertDialog.Footer>
          </form>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
