import { NextResponse } from "next/server";
import { createCategorySchema } from "@/features/category/schemas/category-api.schema";
import { categoryUseCases } from "@/features/category/server/infrastructure/category.container";
import { serializeCategory } from "@/features/category/lib/serialize";
import { CATEGORY_ERRORS } from "@/features/category/server/infrastructure/http/category.http-errors";
import {
  errorFrom,
  getSessionUserId,
  internalError,
  parseBody,
  unauthorized,
  writeLimit,
} from "@/lib/api/route-helpers";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    return NextResponse.json(
      (await categoryUseCases.list.execute(userId)).map(serializeCategory),
    );
  } catch (error) {
    return internalError(req, error, "Error fetching categories");
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, createCategorySchema);
    if ("error" in parsed) return parsed.error;

    const result = await categoryUseCases.create.execute(userId, parsed.data);
    if ("error" in result) return errorFrom(CATEGORY_ERRORS, result.error);
    return NextResponse.json(serializeCategory(result.category), {
      status: result.created ? 201 : 200,
    });
  } catch (error) {
    return internalError(req, error, "Error creating category");
  }
}
