"use client";

import { useEffect, useState } from "react";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { cn } from "@heroui/react";
import { Sheet } from "@/core/components/ui/sheet";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import { useSyncStatus } from "@/core/offline/sync-status";
import { authClient } from "@/lib/auth-client";

const CURRENCIES = [
  { value: "S/", label: "S/ · sol" },
  { value: "$", label: "$ · dólar" },
  { value: "€", label: "€ · euro" },
  { value: "$COP", label: "$ · peso" },
];

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  transactionCount: number;
  onCurrencyChange: (currency: string) => void;
}

export function SettingsSheet({
  isOpen,
  onOpenChange,
  currency,
  transactionCount,
  onCurrencyChange,
}: SettingsSheetProps) {
  return (
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange} title="Ajustes">
      <div className="border-app-border flex items-center justify-between gap-3.5 border-b py-3.5">
        <span>
          <span className="text-app-fg block text-[14.5px] font-semibold">
            Moneda
          </span>
          <span className="text-app-muted mt-px block text-xs">
            Solo cambia el símbolo mostrado
          </span>
        </span>
        <span className="bg-app-fill hover:bg-app-fill-strong text-app-fg relative inline-flex min-h-[34px] items-center gap-[5px] rounded-full px-2.5 text-[13px] font-semibold transition-colors">
          {currency}
          <ChevronsUpDown className="text-app-muted size-3 shrink-0" />
          <select
            aria-label="Moneda"
            value={currency}
            onChange={(event) => onCurrencyChange(event.target.value)}
            className="absolute -inset-x-1 -inset-y-[5px] cursor-pointer appearance-none border-0 opacity-0"
          >
            {CURRENCIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </span>
      </div>

      <div className="border-app-border flex items-center justify-between gap-3.5 border-b py-3.5">
        <span>
          <span className="text-app-fg block text-[14.5px] font-semibold">
            Datos
          </span>
          <span className="text-app-muted mt-px block text-xs">
            {transactionCount}{" "}
            {transactionCount === 1
              ? "movimiento guardado"
              : "movimientos guardados"}{" "}
            en tu cuenta
          </span>
        </span>
      </div>

      <SignOutRow />
    </Sheet>
  );
}

/**
 * Cerrar sesión borra también la cache local del usuario (IndexedDB y las
 * páginas guardadas): en un dispositivo compartido no deben quedar sus
 * datos. Si hay cambios sin sincronizar se perderían, así que se pide un
 * segundo toque; sin conexión no se puede cerrar la sesión en el servidor.
 */
function SignOutRow() {
  const { clearLocalData } = useOfflineSession();
  const { online, pendingCount } = useSyncStatus();
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // la confirmación caduca sola, como la de eliminar un movimiento
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  async function signOut() {
    if (pendingCount > 0 && !confirming) {
      setConfirming(true);
      return;
    }
    setSigningOut(true);
    const { error } = await authClient.signOut();
    if (error) {
      setSigningOut(false);
      return;
    }
    await clearLocalData();
    window.location.replace("/auth/sign-in");
  }

  const hint = !online
    ? "Conéctate a internet para cerrar sesión"
    : confirming
      ? `Tienes ${pendingCount} ${pendingCount === 1 ? "cambio" : "cambios"} sin sincronizar. Toca de nuevo para cerrar sesión y descartarlos`
      : "También borra los datos guardados en este dispositivo";

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={!online || signingOut}
      className="flex w-full items-center justify-between gap-3.5 py-3.5 text-left disabled:opacity-50"
    >
      <span>
        <span
          className={cn(
            "block text-[14.5px] font-semibold",
            confirming ? "text-app-expense" : "text-app-fg",
          )}
        >
          {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
        </span>
        <span className="text-app-muted mt-px block text-xs">{hint}</span>
      </span>
      <LogOut className="text-app-muted size-4 shrink-0" aria-hidden />
    </button>
  );
}
