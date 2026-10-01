import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/route-helpers";
import { runDatabaseCheck, runHealthChecks } from "@/lib/health/checks";
import { rateLimit } from "@/lib/rate-limit";

const REPORTS_PER_MINUTE = 10;
const MINUTE_MS = 60_000;

const noStore = { "Cache-Control": "no-store" };

type HealthChecks = Awaited<ReturnType<typeof runHealthChecks>>;

function hasValidToken(req: Request) {
  const expected = process.env.HEALTH_TOKEN;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function overallStatus(checks: HealthChecks, isDatabaseUp: boolean) {
  if (!isDatabaseUp) return "down";
  return checks.some((check) => check.status === "error") ? "degraded" : "ok";
}

async function uptimeResponse() {
  const database = await runDatabaseCheck();
  const isUp = database.status === "ok";
  return NextResponse.json(
    { status: isUp ? "ok" : "down", checkedAt: new Date().toISOString() },
    { status: isUp ? 200 : 503, headers: noStore },
  );
}

export async function GET(req: Request) {
  if (!req.headers.has("authorization")) return uptimeResponse();

  if (!hasValidToken(req)) return errorResponse("Invalid health token", 401);

  const { allowed } = await rateLimit("health:report", REPORTS_PER_MINUTE, MINUTE_MS);
  if (!allowed) return errorResponse("Too many requests", 429);

  const checks = await runHealthChecks();
  const isDatabaseUp = checks.find((check) => check.id === "database")?.status === "ok";

  return NextResponse.json(
    { status: overallStatus(checks, isDatabaseUp), checkedAt: new Date().toISOString(), checks },
    { status: isDatabaseUp ? 200 : 503, headers: noStore },
  );
}
