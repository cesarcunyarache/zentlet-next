"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { generateObject } from "@/lib/ai/client";
import { allowAiCall } from "@/lib/ai/quota";
import { buildTransactionCategoryPrompt } from "../promps/transaction-category.prompt";
import {
  transactionSuggestionSchema,
  type TransactionSuggestion,
} from "../schemas/transaction-ai.schema";

interface SuggestCategoryInput {
  description: string;
  categories: { id: string; name: string }[];
}

/**
 * Infiere categoría y tipo a partir de la descripción. Devuelve null si no
 * hay sesión, si el texto es muy corto, si se agotó el cupo de IA o si el
 * modelo falla: la sugerencia es una ayuda, nunca bloquea el alta.
 */
export async function suggestTransactionCategory({
  description,
  categories,
}: SuggestCategoryInput): Promise<TransactionSuggestion | null> {
  const text = description.trim().slice(0, 80);
  if (text.length < 3 || !categories.length) return null;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  if (!allowAiCall(session.user.id, "transaction.suggest_category")) return null;

  try {
    const result = (await generateObject({
      operation: "transaction.suggest_category",
      prompt: buildTransactionCategoryPrompt(
        text,
        categories.slice(0, 60).map(({ id, name }) => ({ id, name: name.slice(0, 40) })),
      ),
      schema: transactionSuggestionSchema,
    })) as TransactionSuggestion;

    // el modelo puede alucinar un id: sólo vale si es una categoría real
    const exists = categories.some((c) => c.id === result.categoryId);
    return { categoryId: exists ? result.categoryId : null, type: result.type };
  } catch {
    // `generateObject` ya lo registró
    return null;
  }
}
