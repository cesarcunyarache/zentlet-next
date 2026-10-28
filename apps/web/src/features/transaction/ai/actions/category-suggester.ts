"use server";

import { getActionUserId } from "@/lib/api/action-session";
import type { SuggestCategoryInput, TransactionSuggestion } from "../schemas/transaction-ai.schema";
import { suggestCategory } from "../services/category-suggestion";

export async function suggestTransactionCategory(input: SuggestCategoryInput): Promise<TransactionSuggestion | null> {
  const userId = await getActionUserId();
  if (!userId) return null;
  return suggestCategory(userId, input);
}
