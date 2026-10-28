import { z } from "zod";

export const LIST_LIMITS = {
  name: 60,
  icon: 16,
  color: 32,
  description: 200,
  assignBatch: 100,
  cursor: 200,
  email: 254,
  pageSize: 200,
} as const;

const DEFAULT_PAGE_SIZE = 50;

const fields = {
  name: z.string().trim().min(1).max(LIST_LIMITS.name),
  icon: z.string().min(1).max(LIST_LIMITS.icon),
  color: z.string().min(1).max(LIST_LIMITS.color),
  description: z.string().trim().max(LIST_LIMITS.description).nullable().optional(),
};

export const createListSchema = z.object({ id: z.uuid(), ...fields });

export const updateListSchema = z.object(fields).partial();

export const assignEntriesSchema = z.object({
  transactionIds: z.array(z.uuid()).min(1).max(LIST_LIMITS.assignBatch),
});

export const listEntriesQuerySchema = z.object({
  cursor: z.string().max(LIST_LIMITS.cursor).optional(),
  limit: z.coerce.number().int().min(1).max(LIST_LIMITS.pageSize).default(DEFAULT_PAGE_SIZE),
});

const inviteRole = z.enum(["editor", "viewer"]);

export const createInviteSchema = z.object({ role: inviteRole });

export const emailInviteSchema = z.object({
  role: inviteRole,
  email: z.string().trim().toLowerCase().pipe(z.email().max(LIST_LIMITS.email)),
  locale: z.enum(["es", "en"]).default("es"),
});

export const updateMemberSchema = z.object({ role: inviteRole });

export const inviteTokenSchema = z.string().min(16).max(LIST_LIMITS.cursor);

export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;
export type AssignEntriesInput = z.infer<typeof assignEntriesSchema>;
export type ListEntriesQuery = z.infer<typeof listEntriesQuerySchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type EmailInviteInput = z.infer<typeof emailInviteSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
