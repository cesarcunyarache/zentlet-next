import { z } from "zod";
import { Prisma, type Category as CategoryRow } from "@/generated/prisma/client";
import { categoryIconSchema } from "../../../../ai/schemas/category-ai.schema";
import type { CategoryIcon } from "../../../../ai/schemas/category-ai.schema";
import type { Category, CategoryChanges, NewCategory } from "../../../domain/entities/category.entity";

const storedSuggestions = z.array(categoryIconSchema).nullable().catch(null);

const toJson = (suggestions: CategoryIcon[] | null) => suggestions ?? Prisma.DbNull;

export function toDomain(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    description: row.description,
    aiSuggestions: storedSuggestions.parse(row.aiSuggestions),
    userId: row.userId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPersistence({ aiSuggestions, ...category }: NewCategory) {
  return { ...category, aiSuggestions: toJson(aiSuggestions) };
}

export function toPersistenceChanges({ aiSuggestions, ...fields }: CategoryChanges) {
  return aiSuggestions === undefined ? fields : { ...fields, aiSuggestions: toJson(aiSuggestions) };
}
