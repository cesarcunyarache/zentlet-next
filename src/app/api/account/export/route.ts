import { NextResponse } from "next/server";
import writeXlsxFile from "write-excel-file/node";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { rateLimit } from "@/lib/rate-limit";
import { buildWorkbook, type WorkbookLabels } from "@/features/account/lib/workbook";
import { FEED_ORDER } from "@/features/transaction/lib/feed-query";
import { routing, type Locale } from "@/i18n/routing";
import en from "@/locales/en/settings.json";
import es from "@/locales/es/settings.json";
import { errorResponse, getSessionUserId, internalError, unauthorized } from "@/lib/api/route-helpers";

/*
 * Descarga de todos los datos del usuario en Excel (.xlsx): movimientos y
 * categorías. Lee de la base de datos, no de la cache del dispositivo, así
 * que siempre es completa. Cada export recorre todo el historial: se limita
 * por usuario para que no se pueda usar para cargar la base de datos.
 */

const EXPORTS_PER_MINUTE = 5;
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const LABELS: Record<Locale, WorkbookLabels> = { es: es.export, en: en.export };
const DATE_FORMATS: Record<Locale, string> = { es: "dd/mm/yyyy", en: "mm/dd/yyyy" };

function resolveLocale(value: string | null): Locale {
  return routing.locales.find((locale) => locale === value) ?? routing.defaultLocale;
}

/** `?currency=S/` → "Monto (S/)". El símbolo sólo es texto de la cabecera. */
function withCurrency(labels: WorkbookLabels, currency: string | null): WorkbookLabels {
  const symbol = currency?.trim().slice(0, 4);
  if (!symbol) return labels;
  return { ...labels, columns: { ...labels.columns, amount: `${labels.columns.amount} (${symbol})` } };
}

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    if (!(await rateLimit(`export:${userId}`, EXPORTS_PER_MINUTE, 60_000)).allowed) {
      return errorResponse("Too many exports, try again in a minute", 429);
    }

    const params = new URL(req.url).searchParams;
    const locale = resolveLocale(params.get("locale"));

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
        },
      }),
    ]);

    const sheets = buildWorkbook(
      { transactions, categories },
      withCurrency(LABELS[locale], params.get("currency")),
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
