"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { generateObject } from "@/lib/ai/client";
import { allowAiCall } from "@/lib/ai/quota";
import { buildCategoryPrompt } from "../prompts/category.prompt";
import { normalizeCategorySuggestions } from "../lib/normalize-suggestions";
import { type CategoryAI, categoryAiSchema } from "../schemas/category-ai.schema";

const MAX_PROMPT_LENGTH = 60;
const OPERATION = "category.generate";

export async function generateCategory(prompt: string): Promise<CategoryAI | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const text = prompt.trim().slice(0, MAX_PROMPT_LENGTH);
  if (!text) throw new Error("Empty prompt");

  if (!(await allowAiCall(session.user.id, OPERATION))) return null;

  const result = (await generateObject({
    operation: OPERATION,
    prompt: buildCategoryPrompt(text),
    schema: categoryAiSchema,
  })) as CategoryAI;

  return normalizeCategorySuggestions(result);
}
