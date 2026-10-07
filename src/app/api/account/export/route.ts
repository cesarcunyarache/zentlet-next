import { NextResponse } from "next/server";
import { z } from "zod";
import writeXlsxFile from "write-excel-file/node";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { rateLimit } from "@/lib/rate-limit";
import { buildWorkbook, type WorkbookLabels } from "@/features/account/lib/workbook";
import { FEED_ORDER } from "@/features/transaction/lib/feed-query";
import { routing, type Locale } from "@/i18n/routing";
import en from "@/locales/en/settings.json";
import es from "@/locales/es/settings.json";
import { getSessionUserId, internalError, parseQuery, tooManyRequests, unauthorized } from "@/lib/api/route-helpers";

const EXPORTS_PER_MINUTE = 5;
const RATE_WINDOW_SECONDS = 60;
const MAX_CURRENCY_SYMBOL_LENGTH = 4;
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const LABELS: Record<Locale, WorkbookLabels> = { es: es.export, en: en.export };
const DATE_FORMATS: Record<Locale, string> = { es: "dd/mm/yyyy", en: "mm/dd/yyyy" };

const exportQuerySchema = z.object({
  locale: z.enum(routing.locales).catch(routing.defaultLocale),
  currency: z.string().optional(),
});

function withCurrency(labels: WorkbookLabels, currency: string | undefined): WorkbookLabels {
  const symbol = currency?.trim().slice(0, MAX_CURRENCY_SYMBOL_LENGTH);
  if (!symbol) return labels;
  return { ...labels, columns: { ...labels.columns, amount: `${labels.columns.amount} (${symbol})` } };
}

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { allowed } = await rateLimit(`export:${userId}`, EXPORTS_PER_MINUTE, RATE_WINDOW_SECONDS * 1000);
    if (!allowed) return tooManyRequests("Too many exports, try again in a minute", RATE_WINDOW_SECONDS);

    const parsed = parseQuery(req, exportQuerySchema);
    if ("error" in parsed) return parsed.error;
    const { locale, currency } = parsed.data;

    const [transactions, categories] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: FEED_ORDER,
        select: {
          transactionDate: true,
          type: true,
          amount: true,
          description: true,
          reference: true,
          category: { select: { name: true } },
        },
      }),
      prisma.category.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: {
          name: true,
          icon: true,
          color: true,
          description: true,
          createdAt: true,
          _count: { select: { transactions: true } },
          budget: {
            select: {
              kind: true,
              periodUnit: true,
              periodCount: true,
              limits: { orderBy: { effectiveFrom: "desc" }, take: 1, select: { amount: true } },
            },
          },
        },
      }),
    ]);

    const sheets = buildWorkbook(
      { transactions, categories },
      withCurrency(LABELS[locale], currency),
      DATE_FORMATS[locale],
    );
    const file = await writeXlsxFile(sheets).toBuffer();

    logger.info({ userId, transactions: transactions.length, categories: categories.length }, "account.exported");

    const fileName = `zentlet-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": XLSX_TYPE,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return internalError(req, error, "Error exporting data");
  }
}
