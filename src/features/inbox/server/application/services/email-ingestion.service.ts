import { matchCategory } from "@/features/transaction/lib/parse-description";
import type { EmailMovement, InboundEmail } from "../../../types";
import { knownBankFor } from "../../../lib/banks";
import { emailBody } from "../../../lib/html-text";
import { merchantKey } from "../../../lib/merchant";
import { parseBankEmail } from "../../../lib/parse-email";
import { normalizeAddress, senderVerdict } from "../../../lib/sender";
import { isDkimVerified } from "../../../lib/verification";
import type { DateWindow, NewInboxItem } from "../../domain/entities/inbox-item.entity";
import type { UserCalendar } from "../../domain/ports/inbox.ports";
import type { InboxItemRepository } from "../../domain/repositories/inbox-item.repository";
import type { InboxSenderRepository } from "../../domain/repositories/inbox-sender.repository";
import type { MerchantRuleRepository } from "../../domain/repositories/merchant-rule.repository";

export type IngestOutcome =
  | "unknown_recipient"
  | "verification"
  | "not_allowed"
  | "blocked"
  | "ignored"
  | "duplicate"
  | "created";

const DAY_MS = 86_400_000;
const MAX_SUBJECT_LENGTH = 200;
const GENERIC_PARSER = "generic";

interface ResolvedCategory {
  categoryId: string | null;
  description: string;
  isLearned: boolean;
}

interface ItemContext {
  userId: string;
  email: InboundEmail;
  from: string;
  isNewSender: boolean;
  movement: EmailMovement;
  category: ResolvedCategory;
  isoDate: string;
  duplicateOfId: string | null;
}

function aroundDay(isoDate: string): DateWindow {
  const day = new Date(`${isoDate}T00:00:00.000Z`).getTime();
  return { from: new Date(day - DAY_MS), to: new Date(day + DAY_MS) };
}

function toInboxItem({ userId, email, from, isNewSender, movement, category, isoDate, duplicateOfId }: ItemContext) {
  const bank = knownBankFor(from);

  return {
    userId,
    externalId: email.messageId,
    senderAddress: from,
    bank: bank?.name ?? null,
    subject: email.subject.slice(0, MAX_SUBJECT_LENGTH),
    parser: bank?.id ?? GENERIC_PARSER,
    isVerified: isDkimVerified(email.headers, from),
    isNewSender,
    type: movement.type,
    amount: movement.amount,
    currency: movement.currency,
    merchant: movement.merchant,
    description: category.description,
    categoryId: category.categoryId,
    isLearned: category.isLearned,
    transactionDate: new Date(isoDate),
    cardLast4: movement.cardLast4,
    reference: movement.reference,
    duplicateOfId,
    receivedAt: email.receivedAt,
  } satisfies NewInboxItem;
}

export class EmailIngestionService {
  constructor(
    private readonly inboxItemRepository: InboxItemRepository,
    private readonly inboxSenderRepository: InboxSenderRepository,
    private readonly merchantRuleRepository: MerchantRuleRepository,
    private readonly userCalendar: UserCalendar,
  ) {}

  async ingest(userId: string, email: InboundEmail, body?: string): Promise<IngestOutcome> {
    const from = normalizeAddress(email.from);
    if (!from) return "blocked";

    const rules = await this.inboxSenderRepository.findRules(userId);
    const verdict = senderVerdict(from, rules);
    if (verdict === "blocked") return "blocked";

    const movement = parseBankEmail(body ?? emailBody(email.text, email.html), email.subject);
    if (!movement) return "ignored";

    const isRepeatedEmail = await this.isRepeatedEmail(userId, movement);
    if (isRepeatedEmail) return "duplicate";

    const isoDate = await this.transactionDay(userId, movement, email);
    const [category, duplicateOfId] = await Promise.all([
      this.resolveCategory(userId, movement),
      this.inboxItemRepository.findSimilarTransactionId(userId, movement, aroundDay(isoDate)),
    ]);

    const item = toInboxItem({
      userId,
      email,
      from,
      isNewSender: verdict === "unknown",
      movement,
      category,
      isoDate,
      duplicateOfId,
    });
    return this.inboxItemRepository.insert(item);
  }

  private async isRepeatedEmail(userId: string, movement: EmailMovement) {
    if (!movement.reference) return false;
    return this.inboxItemRepository.hasReference(userId, movement.reference, movement.amount);
  }

  private async transactionDay(userId: string, movement: EmailMovement, email: InboundEmail) {
    if (movement.transactionDate) return movement.transactionDate;
    return this.userCalendar.localDate(userId, email.receivedAt);
  }

  private async resolveCategory(userId: string, movement: EmailMovement): Promise<ResolvedCategory> {
    const learnedRule = await this.findLearnedRule(userId, movement);
    if (learnedRule) {
      return { categoryId: learnedRule.categoryId, description: learnedRule.description, isLearned: true };
    }

    const categories = await this.inboxItemRepository.findMatchableCategories(userId);
    return {
      categoryId: matchCategory(movement.description, categories),
      description: movement.description,
      isLearned: false,
    };
  }

  private async findLearnedRule(userId: string, movement: EmailMovement) {
    const key = merchantKey(movement.merchant ?? movement.description);
    if (!key) return null;
    return this.merchantRuleRepository.find(userId, key);
  }
}
