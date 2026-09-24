"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { generateObject } from "@/lib/ai/client";
import { buildCategoryPrompt } from "../promps/category.prompt";
import { CategoryAI, categoryAiSchema } from "../schemas/category-ai.schema";

/**
 * Las Server Actions son endpoints públicos: sin sesión no se llama al
 * modelo (cada llamada cuesta) y el texto se recorta, igual que en
 * `suggestTransactionCategory`.
 */
export async function generateCategory(prompt: string): Promise<CategoryAI> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const text = prompt.trim().slice(0, 60);
  if (!text) throw new Error("Empty prompt");

  return generateObject({
    operation: "category.generate",
    prompt: buildCategoryPrompt(text),
    schema: categoryAiSchema,
  }) as Promise<CategoryAI>;
}
