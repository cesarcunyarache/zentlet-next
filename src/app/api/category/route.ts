import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { sanitizeSuggestions } from "@/features/category/ai/lib/normalize-suggestions";
import { createCategorySchema } from "@/features/category/schemas/category-api.schema";
import {
  errorResponse,
  getSessionUserId,
  internalError,
  isUniqueViolation,
  parseBody,
  unauthorized,
  writeLimit,
} from "@/lib/api/route-helpers";

/** Tope por usuario: muy por encima del uso real, evita llenar la base de datos. */
const MAX_CATEGORIES = 200;

/** Sólo las categorías del usuario de la sesión. */
export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    return internalError(req, error, "Error fetching categories");
  }
}

/** Idempotente por `id` (lo genera el cliente), igual que los movimientos. */
export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, createCategorySchema);
    if ("error" in parsed) return parsed.error;
    const { id, name, icon, color, description, aiSuggestions } = parsed.data;
    const suggestions = sanitizeSuggestions(aiSuggestions);

    const existing = await prisma.category.findUnique({ where: { id } });
    if (existing) {
      return existing.userId === userId
        ? NextResponse.json(existing, { status: 200 })
        : errorResponse("Category id already in use", 409);
    }

    if ((await prisma.category.count({ where: { userId } })) >= MAX_CATEGORIES) {
      return errorResponse("Category limit reached", 422);
    }

    try {
      const category = await prisma.category.create({
        data: {
          id,
          name,
          icon,
          color,
          description: description ?? null,
          aiSuggestions: suggestions ?? Prisma.DbNull,
          userId,
        },
      });
      return NextResponse.json(category, { status: 201 });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const winner = await prisma.category.findFirst({ where: { id, userId } });
      return winner
        ? NextResponse.json(winner, { status: 200 })
        : errorResponse("Category id already in use", 409);
    }
  } catch (error) {
    return internalError(req, error, "Error creating category");
  }
}
