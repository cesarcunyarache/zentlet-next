import { Repeat } from "lucide-react";
import type { DemoMovement } from "../../../content";
import { MovementRow } from "../../shared/movement-row";

interface RecurringVisualProps {
  movements: DemoMovement[];
  currency: string;
  locale: string;
}

export function RecurringVisual({ movements, currency, locale }: RecurringVisualProps) {
  return (
    <ul aria-hidden className="m-0 flex h-full list-none flex-col justify-center gap-2.5 p-0">
      {movements.map((movement) => (
        <li key={movement.id} className="bg-app-bg relative rounded-2xl p-3 ring-1 ring-app-border">
          <MovementRow movement={movement} currency={currency} locale={locale} />
          <span className="bg-app-fg text-app-bg absolute top-9.5 left-9.5 grid size-4.5 place-items-center rounded-full ring-2 ring-app-bg">
            <Repeat className="size-2.5" strokeWidth={2.6} />
          </span>
        </li>
      ))}
    </ul>
  );
}
