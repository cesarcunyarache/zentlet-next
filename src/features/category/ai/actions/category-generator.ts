"use server";

import { generateObject } from "@/lib/ai/client";
import { buildCategoryPrompt } from "../promps/category.prompt";
import { CategoryAI, categoryAiSchema } from "../schemas/category-ai.schema";

export async function generateCategory(prompt: string): Promise<CategoryAI> {
  return generateObject({
    prompt: buildCategoryPrompt(prompt),
    schema: categoryAiSchema,
  }) as Promise<CategoryAI>;
}
