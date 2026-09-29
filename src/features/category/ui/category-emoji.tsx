import { cn } from "@heroui/react";
import { CATEGORY_FALLBACK_ICON, CATEGORY_FALLBACK_TINT } from "../constants";
import type { CategoryBase } from "../types";

interface CategoryEmojiProps {
  category?: Pick<CategoryBase, "icon" | "color">;
  className?: string;
}

export function CategoryEmoji({ category, className }: CategoryEmojiProps) {
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center leading-none", className)}
      style={{ background: category?.color || CATEGORY_FALLBACK_TINT }}
    >
      {category?.icon || CATEGORY_FALLBACK_ICON}
    </span>
  );
}
