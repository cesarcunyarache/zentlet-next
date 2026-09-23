import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateCategorySchema } from "@/features/category/schemas/category-api.schema";
import {
  errorResponse,
  getSessionUserId,
  isForeignKeyViolation,
  parseBody,
  unauthorized,
} from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

const notFound = () => errorResponse("Category not found", 404);

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const category = await prisma.category.findFirst({ where: { id, userId } });

    if (!category) return notFound();

    return NextResponse.json(category);
  } catch {
    return errorResponse("Error fetching category", 500);
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const parsed = await parseBody(req, updateCategorySchema);
    if ("error" in parsed) return parsed.error;

    const { count } = await prisma.category.updateMany({
      where: { id, userId },
      data: parsed.data,
    });

    if (count === 0) return notFound();

    const category = await prisma.category.findUnique({ where: { id } });

    return NextResponse.json(category);
  } catch {
    return errorResponse("Error updating category", 500);
  }
}

/**
 * 404 si no existe (el cliente lo trata como éxito). 409 si tiene
 * movimientos: la clave foránea es RESTRICT y antes esto era un 500.
 */
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const { count } = await prisma.category.deleteMany({
      where: { id, userId },
    });

    if (count === 0) return notFound();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return errorResponse("Esta categoría tiene movimientos y no se puede eliminar", 409);
    }
    return errorResponse("Error deleting category", 500);
  }
}
