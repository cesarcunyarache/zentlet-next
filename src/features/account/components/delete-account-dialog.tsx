"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertDialog, Button, Input, Label, TextField } from "@heroui/react";
import { UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";

interface DeleteAccountDialogProps {
  isOpen: boolean;
  transactionCount: number;
  onCancel: () => void;
  /** La cuenta ya no existe en el servidor: queda limpiar el dispositivo y salir. */
  onDeleted: () => Promise<void>;
}

type ErrorKey = "invalidPassword" | "sessionExpired" | "fallback";

const ERROR_KEYS: Record<string, ErrorKey> = {
  INVALID_PASSWORD: "invalidPassword",
  SESSION_EXPIRED: "sessionExpired",
};

/**
 * Confirmación del borrado de la cuenta. Quien tiene contraseña la escribe
 * de nuevo; quien entra sólo con Google o GitHub necesita una sesión
 * reciente (si no, se le pide volver a entrar).
 */
export function DeleteAccountDialog({ isOpen, transactionCount, onCancel, onDeleted }: DeleteAccountDialogProps) {
  const t = useTranslations();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    authClient
      .listAccounts()
      .then(({ data, error: listError }) => {
        if (cancelled) return;
        if (listError) return setError("fallback");
        setHasPassword(Boolean(data?.some((account) => account.providerId === "credential")));
      })
      .catch(() => !cancelled && setError("fallback"));
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  function cancel() {
    setError(null);
    onCancel();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = hasPassword ? String(new FormData(event.currentTarget).get("password")) : undefined;
    setDeleting(true);
    setError(null);

    try {
      const { error: deleteError } = await authClient.deleteUser({ password });
      if (deleteError) {
        setError(ERROR_KEYS[deleteError.code ?? ""] ?? "fallback");
        setDeleting(false);
        return;
      }
      await onDeleted();
    } catch {
      setError("fallback");
      setDeleting(false);
    }
  }

  return (
    <AlertDialog.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => !open && !deleting && cancel()}
      isDismissable={!deleting}
      isKeyboardDismissDisabled={deleting}
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
                  <Label htmlFor="delete-account-password">{t("settings.deleteAccount.password")}</Label>
                  <Input
                    id="delete-account-password"
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
                isDisabled={deleting}
                className="bg-app-fill text-app-fg hover:bg-app-fill-strong min-h-12 flex-1 rounded-2xl font-semibold"
              >
                {t("common.actions.cancel")}
              </Button>
              <Button
                type="submit"
                isPending={deleting}
                isDisabled={hasPassword === null}
                className="bg-app-expense text-app-surface min-h-12 flex-1 rounded-2xl font-semibold"
              >
                {t(deleting ? "settings.deleteAccount.pending" : "settings.deleteAccount.confirm")}
              </Button>
            </AlertDialog.Footer>
          </form>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
