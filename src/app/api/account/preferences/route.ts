import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId, internalError, parseBody, unauthorized, writeLimit } from "@/lib/api/route-helpers";
import { preferenceUpdateSchema, preferencesSchema } from "@/features/preference/schemas/preference.schema";

const select = { language: true, currency: true, timezone: true, extras: true } as const;

/** Preferencias de la cuenta; `null` si aún no se crearon. */
export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const row = await prisma.userPreference.findUnique({ where: { userId }, select });
    return NextResponse.json(row && preferencesSchema.parse(row));
  } catch (error) {
    return internalError(req, error, "Error loading preferences");
  }
}

/** Cambia sólo los campos enviados; la primera vez crea la fila. */
export async function PATCH(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, preferenceUpdateSchema);
    if ("error" in parsed) return parsed.error;

    const row = await prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...parsed.data },
      update: parsed.data,
      select,
    });
    return NextResponse.json(preferencesSchema.parse(row));
  } catch (error) {
    return internalError(req, error, "Error saving preferences");
  }
}
