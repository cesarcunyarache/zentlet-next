"use server";

import { getActionUserId } from "@/lib/api/action-session";
import type { CategoryAI } from "../schemas/category-ai.schema";
import { generateCategorySuggestions } from "../services/category-generation";

export async function generateCategory(prompt: string): Promise<CategoryAI | null> {
  const userId = await getActionUserId();
  if (!userId) throw new Error("Unauthorized");
  return generateCategorySuggestions(userId, prompt);
}
