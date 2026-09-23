"use client";

import { ChevronsUpDown } from "lucide-react";
import { Sheet } from "@/core/components/ui/sheet";

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

      <div className="flex items-center justify-between gap-3.5 py-3.5">
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
    </Sheet>
  );
}
