import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { logger } from "@/lib/observability/logger";
import { ensurePrivateListId } from "@/lib/private-list";
import { scheduleBudgetCheck } from "@/features/budget/server/infrastructure/budget.monitor";
import { userLocalDate } from "@/features/preference/server/timezone";
import type {
  BudgetMonitor,
  InboundMailbox,
  InboxMonitor,
  ListPlacement,
  TokenCipher,
  UserCalendar,
} from "../domain/ports/inbox.ports";

export const budgetMonitor: BudgetMonitor = {
  scheduleCheck: scheduleBudgetCheck,
};

export const listPlacement: ListPlacement = {
  privateListFor: (userId: string) => ensurePrivateListId(userId),
};

export const userCalendar: UserCalendar = {
  localDate: userLocalDate,
};

export const inboundMailbox: InboundMailbox = {
  domain() {
    return process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase() || null;
  },
};

export const tokenCipher: TokenCipher = {
  seal: encryptSecret,
  open: decryptSecret,
};

export const inboxMonitor: InboxMonitor = {
  info: (event, context) => logger.info(context, event),
  warn: (event, context) => logger.warn(context, event),
  error: (event, context) => logger.error(context, event),
};
