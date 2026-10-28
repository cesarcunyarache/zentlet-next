"use client";

import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";
import { LIST_ICONS, type ListIcon } from "../../lib/presets";

interface ListIconGridProps {
  value: ListIcon;
  onChange: (icon: ListIcon) => void;
}

export function ListIconGrid({ value, onChange }: ListIconGridProps) {
  const t = useTranslations("lists.form");
  const options = LIST_ICONS.some((option) => option.icon === value.icon) ? LIST_ICONS : [value, ...LIST_ICONS];

  return (
    <div role="radiogroup" aria-label={t("iconLabel")} className="grid grid-cols-6 gap-2">
      {options.map((option) => {
        const isSelected = option.icon === value.icon;
        return (
          <button
            key={option.icon}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option)}
            style={{ background: option.color }}
            className={cn(
              "grid aspect-square place-items-center rounded-2xl text-[22px] transition-[transform,box-shadow] active:scale-95",
              isSelected ? "ring-app-fg ring-2 ring-offset-2 ring-offset-[var(--app-bg)]" : "opacity-80",
            )}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}
