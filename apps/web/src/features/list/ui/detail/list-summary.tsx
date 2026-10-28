"use client";

import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { formatMoney, formatNumber, formatSigned } from "@/lib/money";
import { mergeCategoriesByName, netTotal, sortCategoriesBySpend } from "../../lib/entries";
import type { TListDetail } from "../../types";
import { MemberAvatar } from "../share/member-avatar";

interface ListSummaryProps {
  list: TListDetail;
  currency: string;
}

export function ListSummary({ list, currency }: ListSummaryProps) {
  const t = useTranslations("lists.detail");
  const net = netTotal(list);
  const categories = sortCategoriesBySpend(mergeCategoriesByName(list.byCategory));

  return (
    <section>
      <p className="text-app-muted m-0 text-sm">{t("net")}</p>
      <p
        className={cn(
          "font-display m-0 mt-1 flex items-baseline gap-1.5 leading-none font-bold tracking-[-0.045em] tabular-nums",
          net < 0 ? "text-app-fg" : "text-app-income",
        )}
      >
        {net < 0 ? <span className="text-app-muted text-[24px] font-semibold">−</span> : null}
        <span className="text-[clamp(44px,13vw,60px)]">{formatNumber(Math.abs(net))}</span>
        <span className="text-app-muted text-[20px] font-semibold tracking-normal">{currency}</span>
      </p>

      <dl className="mt-4 flex gap-2">
        <Stat label={t("expenses")} value={`−${formatMoney(list.expenseTotal, currency)}`} tone="expense" />
        <Stat label={t("income")} value={`+${formatMoney(list.incomeTotal, currency)}`} tone="income" />
      </dl>

      {list.memberCount > 1 ? (
        <div className="mt-6">
          <h2 className="text-app-muted m-0 mb-2 text-[13px] font-normal">{t("byMember")}</h2>
          <ul className="scroll-clean -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {list.members.map((member) => (
              <li
                key={member.userId}
                className="bg-app-fill flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-[13px]"
              >
                <MemberAvatar name={member.name} image={member.image} className="size-7 text-xs" />
                <span className="text-app-fg font-semibold">{member.name}</span>
                <span className="num text-app-muted">{formatSigned(member.income - member.expense, currency)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {categories.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-app-muted m-0 mb-2 text-[13px] font-normal">{t("byCategory")}</h2>
          <ul className="scroll-clean -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {categories.map((category) => (
              <li
                key={category.id}
                className="bg-app-fill flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-[13px]"
              >
                <CategoryEmoji category={category} className="size-7 rounded-full text-sm" />
                <span className="text-app-fg font-semibold">{category.name}</span>
                <span className="num text-app-muted">{formatSigned(category.income - category.expense, currency)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "expense" | "income" }) {
  return (
    <div className="bg-app-fill flex-1 rounded-2xl px-3.5 py-2.5">
      <dt className="text-app-muted text-xs">{label}</dt>
      <dd className={cn("num m-0 text-[15px] font-semibold", tone === "expense" ? "text-app-expense" : "text-app-income")}>
        {value}
      </dd>
    </div>
  );
}
