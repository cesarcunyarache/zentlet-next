"use client";

import { AlertDialog, Button } from "@heroui/react";
import { Trash2 } from "lucide-react";
import { formatSigned, signedAmount } from "../lib/format";
import type { TTransaction } from "../types";

interface DeleteTransactionDialogProps {
  transaction: TTransaction | null;
  currency: string;
  onCancel: () => void;
  onConfirm: (transaction: TTransaction) => void;
}

export function DeleteTransactionDialog({
  transaction,
  currency,
  onCancel,
  onConfirm,
}: DeleteTransactionDialogProps) {
  return (
    <AlertDialog.Backdrop
      isOpen={transaction !== null}
      onOpenChange={(open) => !open && onCancel()}
      isDismissable
      isKeyboardDismissDisabled={false}
      className="bg-[var(--app-scrim)]"
    >
      <AlertDialog.Container placement="center" size="sm">
        <AlertDialog.Dialog className="bg-app-surface text-app-fg rounded-[28px] p-6 shadow-[var(--shadow-sheet)]">
          <AlertDialog.Header className="flex flex-col items-center gap-3 text-center">
            <span className="bg-app-expense-soft text-app-expense grid size-14 place-items-center rounded-full">
              <Trash2 className="size-6" strokeWidth={2} aria-hidden />
            </span>
            <AlertDialog.Heading className="font-display m-0 text-xl font-bold tracking-[-0.02em]">
              ¿Eliminar movimiento?
            </AlertDialog.Heading>
          </AlertDialog.Header>

          <AlertDialog.Body className="mt-2 text-center">
            {transaction && (
              <p className="text-app-muted m-0 text-sm leading-relaxed">
                <span className="text-app-fg font-semibold">{transaction.description || "Movimiento"}</span>{" "}
                <span className="num">{formatSigned(signedAmount(transaction), currency)}</span>
                <br />
                Esta acción no se puede deshacer.
              </p>
            )}
          </AlertDialog.Body>

          <AlertDialog.Footer className="mt-6 flex gap-2.5">
            <Button
              type="button"
              onPress={onCancel}
              className="bg-app-fill text-app-fg hover:bg-app-fill-strong min-h-12 flex-1 rounded-2xl font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onPress={() => transaction && onConfirm(transaction)}
              className="bg-app-expense text-app-surface min-h-12 flex-1 rounded-2xl font-semibold"
            >
              Eliminar
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
