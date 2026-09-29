import { Marquee } from "@/core/components/ui/marquee";
import type { DemoMovement } from "../../../content";
import { MovementRow } from "../../shared/movement-row";

interface LiveFeedVisualProps {
  movements: DemoMovement[];
  currency: string;
  locale: string;
}

export function LiveFeedVisual({ movements, currency, locale }: LiveFeedVisualProps) {
  return (
    <div
      aria-hidden
      className="relative h-full min-h-80 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]"
    >
      <Marquee vertical pauseOnHover repeat={3} className="absolute inset-0 [--duration:24s] [--gap:0.625rem]">
        {movements.map((movement) => (
          <div key={movement.id} className="bg-app-bg rounded-2xl p-3 ring-1 ring-[var(--app-border)]">
            <MovementRow movement={movement} currency={currency} locale={locale} />
          </div>
        ))}
      </Marquee>
    </div>
  );
}
