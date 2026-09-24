import prisma from "@/lib/prisma";
import { reportError } from "@/lib/observability/server";

/*
 * Cupos de uso por clave con ventana fija, guardados en la base de datos:
 * el contador es el mismo para todas las instancias del servidor. Un solo
 * `INSERT … ON CONFLICT` cuenta el uso y reinicia la ventana si venció,
 * sin carreras entre peticiones simultáneas.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Usos en la ventana actual, contando éste. */
  count: number;
}

/**
 * Cuenta un uso de `key`. Si la base de datos falla, deja pasar (y lo
 * reporta): el límite protege la app, no debe tumbarla.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  try {
    const [row] = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "usage_limit" ("key", "count", "windowStart")
      VALUES (${key}, 1, now())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "usage_limit"."windowStart" <= now() - make_interval(secs => ${windowMs / 1000}) THEN 1
          ELSE "usage_limit"."count" + 1
        END,
        "windowStart" = CASE
          WHEN "usage_limit"."windowStart" <= now() - make_interval(secs => ${windowMs / 1000}) THEN now()
          ELSE "usage_limit"."windowStart"
        END
      RETURNING "count"`;
    const count = Number(row.count);
    return { allowed: count <= limit, count };
  } catch (error) {
    reportError(error, "rate_limit.unavailable", { key: key.split(":")[0] });
    return { allowed: true, count: 0 };
  }
}
