import { NextResponse } from "next/server";
import { updateCategorySchema } from "@/features/category/schemas/category-api.schema";
import { categoryUseCases } from "@/features/category/server/infrastructure/category.container";
import { serializeCategory } from "@/features/category/lib/serialize";
import { CATEGORY_ERRORS } from "@/features/category/server/infrastructure/http/category.http-errors";
import { errorFrom, getSessionUserId, internalError, parseBody, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, updateCategorySchema);
    if ("error" in parsed) return parsed.error;

    const { id } = await params;
    const result = await categoryUseCases.update.execute(userId, id, parsed.data);
    if ("error" in result) return errorFrom(CATEGORY_ERRORS, result.error);
    return NextResponse.json(serializeCategory(result.category));
  } catch (error) {
    return internalError(req, error, "Error updating category");
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const { id } = await params;
    const result = await categoryUseCases.delete.execute(userId, id);
    if ("error" in result) return errorFrom(CATEGORY_ERRORS, result.error);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error deleting category");
  }
}
