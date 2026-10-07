import type { LandingContent } from "../../content";
import { formatAmount } from "../../lib/format";
import { FloatCard, Parallax, Tilt } from "../shared/pointer-scene";
import { ExpenseComposerDemo } from "./expense-composer-demo";
import { HeroEntrance } from "./hero-entrance";

const BARS = [
  { icon: "🏠", color: "oklch(0.72 0.12 300)", value: 88 },
  { icon: "🛒", color: "oklch(0.78 0.13 75)", value: 56 },
  { icon: "🍜", color: "oklch(0.75 0.12 30)", value: 40 },
  { icon: "🚕", color: "oklch(0.74 0.11 230)", value: 26 },
];

interface HeroVisualProps {
  demo: LandingContent["hero"]["demo"];
  common: LandingContent["common"];
  balance: number;
  locale: string;
}

export function HeroVisual({ demo, common, balance, locale }: HeroVisualProps) {
  return (
    <HeroEntrance className="relative mx-auto w-full max-w-[440px] py-10">
      <Tilt>
        <ExpenseComposerDemo demo={demo} common={common} locale={locale} />
      </Tilt>

      <Parallax isDecorative depth={22} className="absolute -top-2 -left-4 w-[190px] -rotate-[6deg] sm:-left-12">
        <FloatCard delay={0.4}>
          <p className="text-app-muted m-0 text-[11px] font-semibold">{common.balance}</p>
          <p className="font-display text-app-income m-0 mt-0.5 text-[26px] leading-none font-bold tracking-[-0.04em] tabular-nums">
            <span className="text-app-muted mr-1 text-sm font-semibold">{common.currency}</span>
            {formatAmount(balance, locale)}
          </p>
        </FloatCard>
      </Parallax>

      <Parallax isDecorative depth={32} className="absolute -right-3 -bottom-4 w-[150px] rotate-[6deg] sm:-right-10">
        <FloatCard delay={1.4} className="p-3">
          <div className="flex h-16 items-end gap-2">
            {BARS.map((bar) => (
              <div key={bar.icon} className="flex flex-1 flex-col items-center gap-1">
                <span className="w-full rounded-md" style={{ height: `${bar.value}%`, background: bar.color }} />
                <span className="text-[11px] leading-none">{bar.icon}</span>
              </div>
            ))}
          </div>
        </FloatCard>
      </Parallax>

      <Parallax isDecorative depth={40} className="absolute bottom-10 -left-2 sm:-left-8">
        <span className="bg-app-action text-brand-cream grid size-12 place-items-center rounded-full text-2xl font-light shadow-[var(--shadow-action)]">
          +
        </span>
      </Parallax>
    </HeroEntrance>
  );
}
