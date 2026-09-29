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

const OPERATION = "transaction.suggest_category";
const MAX_DESCRIPTION_LENGTH = 80;
const MIN_DESCRIPTION_LENGTH = 3;
const MAX_CATEGORIES = 60;
const MAX_CATEGORY_NAME_LENGTH = 40;

async function canSuggest() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return false;
  return allowAiCall(session.user.id, OPERATION);
}

function promptCategories(categories: SuggestCategoryInput["categories"]) {
  return categories
    .slice(0, MAX_CATEGORIES)
    .map(({ id, name }) => ({ id, name: name.slice(0, MAX_CATEGORY_NAME_LENGTH) }));
}

export async function suggestTransactionCategory({
  description,
  categories,
}: SuggestCategoryInput): Promise<TransactionSuggestion | null> {
  const text = description.trim().slice(0, MAX_DESCRIPTION_LENGTH);
  if (text.length < MIN_DESCRIPTION_LENGTH || !categories.length) return null;
  if (!(await canSuggest())) return null;

  try {
    const result = (await generateObject({
      operation: OPERATION,
      prompt: buildTransactionCategoryPrompt(text, promptCategories(categories)),
      schema: transactionSuggestionSchema,
    })) as TransactionSuggestion;

    const exists = categories.some((category) => category.id === result.categoryId);
    return { categoryId: exists ? result.categoryId : null, type: result.type };
  } catch {
    return null;
  }
}
