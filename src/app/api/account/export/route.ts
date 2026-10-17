import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { exportQuerySchema } from "@/features/account/schemas/export.schema";
import { accountUseCases } from "@/features/account/server/infrastructure/account.container";
import { getSessionUserId, internalError, parseQuery, tooManyRequests, unauthorized } from "@/lib/api/route-helpers";

const EXPORTS_PER_MINUTE = 5;
const RATE_WINDOW_SECONDS = 60;
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { allowed } = await rateLimit(`export:${userId}`, EXPORTS_PER_MINUTE, RATE_WINDOW_SECONDS * 1000);
    if (!allowed) return tooManyRequests("Too many exports, try again in a minute", RATE_WINDOW_SECONDS);

    const parsed = parseQuery(req, exportQuerySchema);
    if ("error" in parsed) return parsed.error;

    const { file, fileName } = await accountUseCases.export.execute(userId, parsed.data);
    return new NextResponse(file, {
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
