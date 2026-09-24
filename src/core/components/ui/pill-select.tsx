"use client";

import type { ReactNode } from "react";
import { ListBox, Select, cn } from "@heroui/react";
import { ChevronsUpDown } from "lucide-react";

export interface PillSelectOption<T extends string> {
  value: T;
  label: string;
}

interface PillSelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly PillSelectOption<T>[];
  onChange: (value: T) => void;
  /** Lo que muestra la píldora; por defecto, la etiqueta de la opción elegida. */
  display?: ReactNode;
  className?: string;
}

/** Select de HeroUI con la forma de píldora de la app. */
export function PillSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  display,
  className,
}: PillSelectProps<T>) {
  const selected = options.find((option) => option.value === value);

  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(key) => key !== null && onChange(String(key) as T)}
      className="w-fit"
    >
      <Select.Trigger
        className={cn(
          "text-app-fg hover:bg-app-fill-strong inline-flex min-h-[34px] w-fit items-center gap-[5px] rounded-full border-0 bg-transparent px-2.5 text-[13px] font-semibold shadow-none transition-colors",
          className,
        )}
      >
        {display ?? selected?.label}
        <ChevronsUpDown className="text-app-muted size-3 shrink-0" aria-hidden />
      </Select.Trigger>
      <Select.Popover className="w-auto min-w-44">
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
