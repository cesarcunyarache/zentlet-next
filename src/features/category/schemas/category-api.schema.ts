import { z } from "zod";

const fields = {
  name: z.string().trim().min(1).max(60),
  icon: z.string().min(1).max(16),
  color: z.string().min(1).max(32),
  description: z.string().max(200).nullable().optional(),
  aiSuggestions: z
    .array(z.object({ icon: z.string().max(16), color: z.string().max(32) }))
    .max(4)
    .nullable()
    .optional(),
};

export const createCategorySchema = z.object({ id: z.uuid(), ...fields });

export const updateCategorySchema = z.object(fields).partial();
