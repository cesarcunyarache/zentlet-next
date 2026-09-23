"use client";

import { motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import { cn } from "@heroui/react";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";

export interface GridCategory {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

interface CategoryGridProps {
  categories: GridCategory[];
  /** Línea opcional bajo el nombre, p. ej. lo gastado en el periodo. */
  caption?: (category: GridCategory) => string | null;
  selectedId?: string | null;
  onSelect?: (category: GridCategory) => void;
  onAdd: () => void;
  className?: string;
}

const FALLBACK_TINT = "var(--app-fill-strong)";

/** Recuadros pastel con el emoji y el nombre debajo; el último añade. */
export function CategoryGrid({
  categories,
  caption,
  selectedId,
  onSelect,
  onAdd,
  className,
}: CategoryGridProps) {
  const reduceMotion = useReducedMotion();

  const enter = (index: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12, scale: 0.94 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { ...SPRING_LAYOUT, delay: Math.min(index, 12) * 0.035 },
        };

  return (
    <div className={cn("grid grid-cols-3 gap-x-4 gap-y-5 sm:gap-x-5", className)}>
      {categories.map((category, index) => {
        const selected = selectedId === category.id;
        const detail = caption?.(category);
        const Tile = onSelect ? motion.button : motion.div;

        return (
          <motion.div key={category.id} {...enter(index)} className="flex flex-col items-center gap-2">
            <Tile
              {...(onSelect ? { type: "button" as const, onClick: () => onSelect(category) } : {})}
              aria-label={onSelect ? category.name : undefined}
              aria-pressed={onSelect ? selected : undefined}
              whileHover={reduceMotion || !onSelect ? undefined : { y: -3 }}
              whileTap={onSelect ? { scale: 0.93, transition: SPRING_PRESS } : undefined}
              style={{ backgroundColor: category.color || FALLBACK_TINT }}
              className={cn(
                "group grid aspect-square w-full place-items-center rounded-[26px] transition-shadow",
                selected && "ring-app-fg ring-offset-app-bg ring-2 ring-offset-2",
              )}
            >
              <span
                aria-hidden
                className="text-[40px] leading-none transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 sm:text-5xl"
              >
                {category.icon || "📦"}
              </span>
            </Tile>
            <span className="flex min-w-0 flex-col items-center">
              <span className="text-app-fg max-w-full truncate text-sm font-semibold">
                {category.name}
              </span>
              {detail && <span className="num text-app-muted text-[11px]">{detail}</span>}
            </span>
          </motion.div>
        );
      })}

      <motion.div {...enter(categories.length)} className="flex flex-col items-center gap-2">
        <motion.button
          type="button"
          onClick={onAdd}
          whileTap={{ scale: 0.93, transition: SPRING_PRESS }}
          className="group border-app-border text-app-muted hover:border-app-muted hover:text-app-fg grid aspect-square w-full place-items-center rounded-[26px] border-2 border-dashed transition-colors"
        >
          <Plus className="size-7 transition-transform duration-300 group-hover:rotate-90" strokeWidth={1.6} />
          <span className="sr-only">Añadir categoría</span>
        </motion.button>
        <span aria-hidden className="text-app-muted text-sm font-semibold">
          Añadir categoría
        </span>
      </motion.div>
    </div>
  );
}
