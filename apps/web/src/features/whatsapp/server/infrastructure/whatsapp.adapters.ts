import { createTranslator, hasLocale } from "next-intl";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { routing, type Locale } from "@/i18n/routing";
import en from "@/locales/en/whatsapp.json";
import es from "@/locales/es/whatsapp.json";
import { categoryUseCases } from "@/features/category/server/infrastructure/category.container";
import { currencySymbol, parseStoredCurrency } from "@/features/preference/lib/currency";
import { preferenceUseCases } from "@/features/preference/server/infrastructure/preference.container";
import { scanReceiptImage } from "@/features/transaction/ai/services/receipt-scan";
import { transactionUseCases } from "@/features/transaction/server/infrastructure/transaction.container";
import { interpretMessage } from "../../ai/services/message-interpretation";
import type { Translate } from "../../lib/replies";
import type { ChatCategory, ReceiptResult } from "../../types";
import type { Ledger, MessageInterpreter, TextsFor, Throttle } from "../domain/ports/whatsapp.ports";

const USAGE_WINDOW_DAYS = 90;
const DAY_MS = 86_400_000;
const MESSAGES = { es, en } satisfies Record<Locale, typeof es>;

const dayAfter = (isoDate: string) => new Date(Date.parse(`${isoDate}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10);

async function categoriesByUsage(userId: string): Promise<ChatCategory[]> {
  const since = new Date(Date.now() - USAGE_WINDOW_DAYS * DAY_MS);
  const [categories, usage] = await Promise.all([
    categoryUseCases.list.execute(userId),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, transactionDate: { gte: since } },
      _count: { _all: true },
    }),
  ]);
  const uses = new Map(usage.map((group) => [group.categoryId, group._count._all]));
  return categories
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0));
}

export const ledger: Ledger = {
  async profile(userId) {
    const [user, today] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { name: true, preference: { select: { language: true, currency: true } } },
      }),
      preferenceUseCases.localDate.execute(userId),
    ]);
    const language = user.preference?.language;
    return {
      name: user.name.split(" ")[0] || user.name,
      locale: language && hasLocale(routing.locales, language) ? language : routing.defaultLocale,
      currency: currencySymbol(parseStoredCurrency(user.preference?.currency ?? null)),
      today,
    };
  },

  categories: categoriesByUsage,

  async record(userId, id, movement) {
    const result = await transactionUseCases.create.execute(userId, {
      id,
      type: movement.type,
      amount: movement.amount,
      categoryId: movement.categoryId,
      description: movement.description,
      transactionDate: movement.date,
    });
    return !("error" in result);
  },

  async remove(userId, ids) {
    const results = await Promise.all(ids.map((id) => transactionUseCases.delete.execute(userId, id)));
    return results.filter((result) => !("error" in result)).length;
  },

  summarize(userId, { from, to }) {
    return transactionUseCases.summarize.execute(userId, { from, to: dayAfter(to), ids: [] });
  },
};

export const interpreter: MessageInterpreter = {
  interpret: interpretMessage,

  async readReceipt(userId, image, categories, today): Promise<ReceiptResult> {
    const result = await scanReceiptImage(userId, { image, categories, today });
    if (!result.ok) return { ok: false, error: result.error === "invalid_image" ? "failed" : result.error };
    const { extraction } = result;
    return {
      ok: true,
      movement: {
        type: extraction.type,
        amount: extraction.amount,
        categoryId: extraction.categoryId,
        description: extraction.description || extraction.summary || null,
        date: extraction.date,
      },
    };
  },
};

export const throttle: Throttle = {
  async allow(key, limit, windowMs) {
    return (await rateLimit(key, limit, windowMs)).allowed;
  },
};

export const textsFor: TextsFor = (locale): Translate => {
  const t = createTranslator({ locale, messages: { whatsapp: MESSAGES[locale] }, namespace: "whatsapp" });
  return (key, values) => t(key as keyof typeof es, values);
};
