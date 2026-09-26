"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { generateObject } from "@/lib/ai/client";
import { allowAiCall } from "@/lib/ai/quota";
import { buildCategoryPrompt } from "../promps/category.prompt";
import { normalizeCategorySuggestions } from "../lib/normalize-suggestions";
import { CategoryAI, categoryAiSchema } from "../schemas/category-ai.schema";

/**
 * Las Server Actions son endpoints públicos: sin sesión no se llama al
 * modelo (cada llamada cuesta) y el texto se recorta, igual que en
 * `suggestTransactionCategory`. Devuelve null si el usuario agotó su cupo
 * de IA o si ninguna sugerencia es válida: el formulario usa entonces
 * los iconos de reserva.
 */
export async function generateCategory(prompt: string): Promise<CategoryAI | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const text = prompt.trim().slice(0, 60);
  if (!text) throw new Error("Empty prompt");

  if (!(await allowAiCall(session.user.id, "category.generate"))) return null;

  const result = (await generateObject({
    operation: "category.generate",
    prompt: buildCategoryPrompt(text),
    schema: categoryAiSchema,
  })) as CategoryAI;

  // lo que el modelo no respetó (emoji compuesto, color no pastel) se corrige o se descarta
  return normalizeCategorySuggestions(result);
}
