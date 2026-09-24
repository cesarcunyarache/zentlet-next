"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { generateObject } from "@/lib/ai/client";
import { allowAiCall } from "@/lib/ai/quota";
import { buildCategoryPrompt } from "../promps/category.prompt";
import { CategoryAI, categoryAiSchema } from "../schemas/category-ai.schema";

/**
 * Las Server Actions son endpoints públicos: sin sesión no se llama al
 * modelo (cada llamada cuesta) y el texto se recorta, igual que en
 * `suggestTransactionCategory`. Devuelve null si el usuario agotó su cupo
 * de IA: el formulario usa entonces los iconos de reserva.
 */
export async function generateCategory(prompt: string): Promise<CategoryAI | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const text = prompt.trim().slice(0, 60);
  if (!text) throw new Error("Empty prompt");

  if (!allowAiCall(session.user.id, "category.generate")) return null;

  return generateObject({
    operation: "category.generate",
    prompt: buildCategoryPrompt(text),
    schema: categoryAiSchema,
  }) as Promise<CategoryAI>;
}
