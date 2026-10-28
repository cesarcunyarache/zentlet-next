import { NextResponse } from "next/server";
import { getSessionUserId, internalError, parseBody, unauthorized, writeLimit } from "@/lib/api/route-helpers";
import { preferenceUpdateSchema } from "@/features/preference/schemas/preference.schema";
import { preferenceUseCases } from "@/features/preference/server/infrastructure/preference.container";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    return NextResponse.json(await preferenceUseCases.get.execute(userId));
  } catch (error) {
    return internalError(req, error, "Error loading preferences");
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, preferenceUpdateSchema);
    if ("error" in parsed) return parsed.error;

    return NextResponse.json(await preferenceUseCases.update.execute(userId, parsed.data));
  } catch (error) {
    return internalError(req, error, "Error saving preferences");
  }
}
