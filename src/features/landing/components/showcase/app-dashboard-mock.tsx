import { AnimatedList } from "@/core/components/ui/animated-list";
import { NumberTicker } from "@/core/components/ui/number-ticker";
import { CategoryEmoji } from "@/features/category/components/category-emoji";
import { cn } from "@/lib/utils";
import type { LandingContent } from "../../content";
import { formatAmount, vivid } from "../../lib/format";
import { GrowingBar } from "../shared/growing-bar";
import { MovementRow } from "../shared/movement-row";

const PANEL_CLASS = "bg-app-surface rounded-3xl p-5 shadow-[0_1px_2px_color-mix(in_oklch,var(--app-fg)_6%,transparent)]";
const BAR_STAGGER_S = 0.1;
const MOVEMENT_INTERVAL_MS = 1400;

type Dashboard = LandingContent["showcase"]["dashboard"];
type Common = LandingContent["common"];

interface AppDashboardMockProps {
  dashboard: Dashboard;
  movements: LandingContent["movements"];
  common: Common;
  locale: string;
}

export function AppDashboardMock({ dashboard, movements, common, locale }: AppDashboardMockProps) {
  return (
    <div aria-hidden className="grid h-full gap-4 overflow-hidden p-4 md:grid-cols-[1.15fr_1fr] md:p-6">
      <div className="flex min-h-0 flex-col gap-4">
        <MonthSummary dashboard={dashboard} common={common} locale={locale} />
        <CategoryBreakdown dashboard={dashboard} locale={locale} />
      </div>

      <div className={cn(PANEL_CLASS, "hidden min-h-0 flex-col md:flex")}>
        <p className="text-app-muted m-0 mb-4 text-xs font-semibold">{dashboard.recent}</p>
        <div className="relative min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_75%,transparent)]">
          <AnimatedList delay={MOVEMENT_INTERVAL_MS} className="gap-3">
            {movements.map((movement) => (
              <div key={movement.id} className="bg-app-bg w-full rounded-2xl p-3">
                <MovementRow movement={movement} currency={common.currency} locale={locale} />
              </div>
            ))}
          </AnimatedList>
        </div>
      </div>
    </div>
  );
}

function MonthSummary({ dashboard, common, locale }: { dashboard: Dashboard; common: Common; locale: string }) {
  const { totals } = dashboard;

  return (
    <div className={PANEL_CLASS}>
      <div className="flex items-center justify-between">
        <p className="text-app-muted m-0 text-sm font-semibold">{dashboard.greeting}</p>
        <span className="bg-app-fill text-app-fg rounded-full px-3 py-1 text-xs font-semibold">{dashboard.period}</span>
      </div>
      <p className="text-app-muted m-0 mt-4 text-xs font-semibold">{common.balance}</p>
      <p className="font-display text-app-fg m-0 mt-1 text-4xl leading-none font-bold tracking-[-0.04em] md:text-5xl">
        <span className="text-app-muted mr-2 text-xl font-semibold">{common.currency}</span>
        <NumberTicker value={totals.balance} decimalPlaces={2} locale={locale} />
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="bg-app-income-soft text-app-income num rounded-full px-3 py-1 text-xs font-semibold">
          + {formatAmount(totals.income, locale)}
        </span>
        <span className="bg-app-expense-soft text-app-expense num rounded-full px-3 py-1 text-xs font-semibold">
          − {formatAmount(totals.expense, locale)}
        </span>
      </div>
    </div>
  );
}

function CategoryBreakdown({ dashboard, locale }: { dashboard: Dashboard; locale: string }) {
  const { categories } = dashboard;
  const maxTotal = Math.max(...categories.map((category) => category.total));

  return (
    <div className={cn(PANEL_CLASS, "flex min-h-0 flex-1 flex-col")}>
      <p className="text-app-muted m-0 text-xs font-semibold">{dashboard.byCategory}</p>
      <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
        {categories.map((category, index) => (
          <li key={category.name} className="flex items-center gap-3">
            <CategoryEmoji category={category} className="size-8 rounded-xl text-base" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-app-fg truncate text-xs font-semibold">{category.name}</span>
                <span className="num text-app-muted text-[11px]">{formatAmount(category.total, locale)}</span>
              </div>
              <GrowingBar
                ratio={category.total / maxTotal}
                color={vivid(category.color)}
                duration={0.9}
                delay={BAR_STAGGER_S * index}
                viewportAmount={0.6}
                className="mt-1 h-1.5"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
