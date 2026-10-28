import { generateObject } from "@/lib/ai/client";
import { allowAiCall } from "@/lib/ai/quota";
import { normalizeCategorySuggestions } from "../lib/normalize-suggestions";
import { buildCategoryPrompt } from "../prompts/category.prompt";
import { type CategoryAI, categoryAiSchema } from "../schemas/category-ai.schema";

const MAX_PROMPT_LENGTH = 60;
const OPERATION = "category.generate";

export async function generateCategorySuggestions(userId: string, prompt: string): Promise<CategoryAI | null> {
  const text = prompt.trim().slice(0, MAX_PROMPT_LENGTH);
  if (!text) throw new Error("Empty prompt");

  if (!(await allowAiCall(userId, OPERATION))) return null;

  const result = (await generateObject({
    operation: OPERATION,
    prompt: buildCategoryPrompt(text),
    schema: categoryAiSchema,
  })) as CategoryAI;

  return normalizeCategorySuggestions(result);
}
