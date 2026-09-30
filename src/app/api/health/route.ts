import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/route-helpers";
import { runDatabaseCheck, runHealthChecks } from "@/lib/health/checks";
import { rateLimit } from "@/lib/rate-limit";

/** El informe llama a APIs externas: pocas veces por minuto basta. */
const REPORTS_PER_MINUTE = 10;

const noStore = { "Cache-Control": "no-store" };

/** `Authorization: Bearer <HEALTH_TOKEN>`; sin `HEALTH_TOKEN` configurado no hay informe detallado. */
function hasValidToken(req: Request) {
  const expected = process.env.HEALTH_TOKEN;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Sin credencial: sólo si la base de datos responde (200 / 503), para
 * monitores de uptime; ni configuración ni llamadas a terceros. Con
 * `HEALTH_TOKEN`: el estado de cada servicio. Ningún secreto sale en la respuesta.
 */
export async function GET(req: Request) {
  if (!req.headers.has("authorization")) {
    const database = await runDatabaseCheck();
    const up = database.status === "ok";
    return NextResponse.json(
      { status: up ? "ok" : "down", checkedAt: new Date().toISOString() },
      { status: up ? 200 : 503, headers: noStore },
    );
  }

  if (!hasValidToken(req)) return errorResponse("Invalid health token", 401);

  const { allowed } = await rateLimit("health:report", REPORTS_PER_MINUTE, 60_000);
  if (!allowed) return errorResponse("Too many requests", 429);

  const checks = await runHealthChecks();
  const databaseUp = checks.find((check) => check.id === "database")?.status === "ok";
  const status = !databaseUp ? "down" : checks.some((check) => check.status === "error") ? "degraded" : "ok";

  return NextResponse.json(
    { status, checkedAt: new Date().toISOString(), checks },
    { status: databaseUp ? 200 : 503, headers: noStore },
  );
}
