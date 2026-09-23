import { CategoryEmoji } from "@/features/transaction/components/category-emoji";
import { cn } from "@/lib/utils";
import type { DemoMovement } from "../../content";
import { formatSigned } from "../../lib/format";

interface MovementRowProps {
  movement: DemoMovement;
  currency: string;
  locale: string;
  className?: string;
}

/** Fila de movimiento tal como se ve en la app. */
export function MovementRow({ movement, currency, locale, className }: MovementRowProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <CategoryEmoji category={movement.category} className="size-10 rounded-2xl text-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-app-fg m-0 truncate text-sm font-semibold">{movement.description}</p>
        <p className="text-app-muted m-0 text-xs">
          {movement.category.name} · {movement.when}
        </p>
      </div>
      <span
        className={cn(
          "num shrink-0 text-sm font-semibold",
          movement.type === "income" ? "text-app-income" : "text-app-fg",
        )}
      >
        {formatSigned(movement.amount, movement.type, currency, locale)}
      </span>
    </div>
  );
}
