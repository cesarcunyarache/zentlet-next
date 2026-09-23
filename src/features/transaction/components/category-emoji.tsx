import { cn } from "@heroui/react";
import type { CategoryLike } from "../types";

const FALLBACK_TINT = "oklch(0.90 0.01 290)";

interface CategoryEmojiProps {
  category?: Pick<CategoryLike, "icon" | "color">;
  className?: string;
}

/** Cuadro con el emoji de la categoría sobre su color pastel. */
export function CategoryEmoji({ category, className }: CategoryEmojiProps) {
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center leading-none", className)}
      style={{ background: category?.color || FALLBACK_TINT }}
    >
      {category?.icon || "📦"}
    </span>
  );
}
