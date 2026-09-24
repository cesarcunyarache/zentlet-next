import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/route-helpers";
import { runHealthChecks } from "@/lib/health/checks";
import { rateLimit } from "@/lib/rate-limit";

/** El informe llama a APIs externas: pocas veces por minuto basta. */
const REPORTS_PER_MINUTE = 10;

const noStore = { "Cache-Control": "no-store" };

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

/**
 * Público por ahora (sin sesión): estado de cada servicio. 200 mientras la
 * base de datos responda, 503 si no. Ningún secreto sale en la respuesta.
 */
export async function GET(req: Request) {
  const { allowed } = await rateLimit(`health:${clientIp(req)}`, REPORTS_PER_MINUTE, 60_000);
  if (!allowed) return errorResponse("Too many requests", 429);

  const checks = await runHealthChecks();
  const databaseUp = checks.find((check) => check.id === "database")?.status === "ok";
  const status = !databaseUp ? "down" : checks.some((check) => check.status === "error") ? "degraded" : "ok";

  return NextResponse.json(
    { status, checkedAt: new Date().toISOString(), checks },
    { status: databaseUp ? 200 : 503, headers: noStore },
  );
}
