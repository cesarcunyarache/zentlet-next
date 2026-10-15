import { intlLocales } from "@/i18n/routing";
import { formatMoney } from "@/lib/money";
import { parseISODate } from "@/lib/dates";
import type { TransactionSummary } from "@/features/transaction/types";
import type { ChatCategory, ChatProfile, Movement, Reply } from "../types";
import { cancelChoiceId, categoryChoiceId, undoChoiceId, type ReadyMovement } from "./conversation";

export type Translate = (key: string, values?: Record<string, string | number>) => string;

const MAX_LIST_ROWS = 10;
const MAX_ROW_TITLE = 24;
const MAX_TOP_CATEGORIES = 3;
const MS_PER_DAY = 86_400_000;

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function createReplies(t: Translate, profile: ChatProfile, categories: ChatCategory[]) {
  const intlLocale = intlLocales[profile.locale];
  const money = (amount: number) => formatMoney(amount, profile.currency);
  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? "—";

  const shortDate = (isoDate: string) =>
    new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "short" }).format(parseISODate(isoDate));

  const dayLabel = (isoDate: string) => {
    const daysAgo = Math.round((parseISODate(profile.today).getTime() - parseISODate(isoDate).getTime()) / MS_PER_DAY);
    if (daysAgo === 0) return t("today");
    if (daysAgo === 1) return t("yesterday");
    return shortDate(isoDate);
  };

  const text = (key: string, values?: Record<string, string | number>): Reply => ({ kind: "text", text: t(key, values) });

  return {
    text,

    askAmount(draft: Movement): Reply {
      return {
        kind: "buttons",
        text: draft.description ? t("askAmount", { description: draft.description }) : t("askAmountGeneric"),
        buttons: [{ id: cancelChoiceId(), title: t("cancelButton") }],
      };
    },

    askCategory(draft: Movement): Reply {
      if (!categories.length) return text("noCategories");
      const question = t("askCategory", { description: draft.description ?? "", amount: money(draft.amount ?? 0) });
      const hasMore = categories.length > MAX_LIST_ROWS;
      return {
        kind: "list",
        text: hasMore ? `${question}\n${t("askCategoryMore")}` : question,
        button: t("categoriesButton"),
        rows: categories.slice(0, MAX_LIST_ROWS).map((category) => ({
          id: categoryChoiceId(category.id),
          title: truncate(category.name, MAX_ROW_TITLE),
        })),
      };
    },

    recorded(movements: ReadyMovement[], ids: string[]): Reply {
      const kind = (movement: ReadyMovement) => t(movement.type);
      const [first] = movements;
      const body =
        movements.length === 1
          ? t("recorded", {
              kind: kind(first),
              amount: money(first.amount),
              category: categoryName(first.categoryId),
              date: dayLabel(first.date),
            })
          : t("recordedMany", {
              count: movements.length,
              lines: movements
                .map((movement) =>
                  t("recordedLine", {
                    kind: kind(movement),
                    amount: money(movement.amount),
                    category: categoryName(movement.categoryId),
                  }),
                )
                .join("\n"),
            });
      return { kind: "buttons", text: body, buttons: [{ id: undoChoiceId(ids), title: t("undoButton") }] };
    },

    summary(summary: TransactionSummary, from: string, to: string): Reply {
      const range = { from: shortDate(from), to: shortDate(to) };
      if (summary.count === 0) return text("summaryEmpty", range);
      const top = Object.entries(summary.byCategory)
        .filter(([, totals]) => totals.expense > 0)
        .sort(([, a], [, b]) => b.expense - a.expense)
        .slice(0, MAX_TOP_CATEGORIES)
        .map(([id, totals]) => t("summaryLine", { category: categoryName(id), amount: money(totals.expense) }));
      const totals = t("summary", { ...range, expense: money(summary.expenseTotal), income: money(summary.incomeTotal) });
      return { kind: "text", text: top.length ? `${totals}\n\n${t("summaryTop", { lines: top.join("\n") })}` : totals };
    },
  };
}

export type Replies = ReturnType<typeof createReplies>;
