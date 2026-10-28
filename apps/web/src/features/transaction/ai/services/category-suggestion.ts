import { generateObject } from "@/lib/ai/client";
import { allowAiCall } from "@/lib/ai/quota";
import { limitPromptCategories } from "../prompts/prompt-categories";
import { buildTransactionCategoryPrompt } from "../prompts/transaction-category.prompt";
import {
  suggestCategoryInputSchema,
  transactionSuggestionSchema,
  type TransactionSuggestion,
} from "../schemas/transaction-ai.schema";

const OPERATION = "transaction.suggest_category";
const MAX_DESCRIPTION_LENGTH = 80;
const MIN_DESCRIPTION_LENGTH = 3;

export async function suggestCategory(userId: string, input: unknown): Promise<TransactionSuggestion | null> {
  const parsed = suggestCategoryInputSchema.safeParse(input);
  if (!parsed.success) return null;
  const { description, categories } = parsed.data;

  const text = description.trim().slice(0, MAX_DESCRIPTION_LENGTH);
  if (text.length < MIN_DESCRIPTION_LENGTH || !categories.length) return null;
  if (!(await allowAiCall(userId, OPERATION))) return null;

  try {
    const result = (await generateObject({
      operation: OPERATION,
      prompt: buildTransactionCategoryPrompt(text, limitPromptCategories(categories)),
      schema: transactionSuggestionSchema,
    })) as TransactionSuggestion;

    const exists = categories.some((category) => category.id === result.categoryId);
    return { categoryId: exists ? result.categoryId : null, type: result.type };
  } catch {
    return null;
  }
}
