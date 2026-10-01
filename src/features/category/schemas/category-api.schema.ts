import { z } from "zod";

export const CATEGORY_LIMITS = {
  name: 60,
  icon: 16,
  color: 32,
  description: 200,
  aiSuggestions: 4,
} as const;

const aiSuggestion = z.object({
  icon: z.string().max(CATEGORY_LIMITS.icon),
  color: z.string().max(CATEGORY_LIMITS.color),
});

const fields = {
  name: z.string().trim().min(1).max(CATEGORY_LIMITS.name),
  icon: z.string().min(1).max(CATEGORY_LIMITS.icon),
  color: z.string().min(1).max(CATEGORY_LIMITS.color),
  description: z.string().max(CATEGORY_LIMITS.description).nullable().optional(),
  aiSuggestions: z.array(aiSuggestion).max(CATEGORY_LIMITS.aiSuggestions).nullable().optional(),
};

export const createCategorySchema = z.object({ id: z.uuid(), ...fields });

export const updateCategorySchema = z.object(fields).partial();
