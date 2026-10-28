"use client";

import { cn } from "@heroui/react";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import type { CategoryBase } from "@/features/category/types";

interface InboxCategoryPickerProps {
  label: string;
  categories: CategoryBase[];
  selectedId: string | null;
  onPick: (categoryId: string) => void;
}

export function InboxCategoryPicker({ label, categories, selectedId, onPick }: InboxCategoryPickerProps) {
  return (
    <div role="group" aria-label={label} className="scroll-clean -mx-4 flex gap-2 overflow-x-auto px-4">
      {categories.map((category) => {
        const isActive = category.id === selectedId;
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onPick(category.id)}
            className={cn(
              "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full py-0 pr-3 pl-1 text-[12.5px] font-semibold transition-colors",
              isActive ? "bg-app-fg text-app-surface" : "bg-app-fill text-app-fg hover:bg-app-fill-strong",
            )}
          >
            <CategoryEmoji category={category} className="size-7 rounded-full text-[13px]" />
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
