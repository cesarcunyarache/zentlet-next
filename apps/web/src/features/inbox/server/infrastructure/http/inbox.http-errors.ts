import type { ErrorTable } from "@/lib/api/route-helpers";
import type { InboxError } from "../../domain/errors/inbox.errors";

export const INBOX_ERRORS: ErrorTable<InboxError> = {
  not_found: ["Inbox item not found", 404],
  category_not_found: ["Category not found", 422],
  sender_not_found: ["Sender not found", 404],
  invalid_sender: ["Invalid sender", 422],
  email_import_unavailable: ["Email import is not configured", 503],
};
