import { Injectable } from '@nestjs/common';
import { InboxTransactionRepository } from '../../domain/inbox-transaction/inbox-transaction.repository.js';
import type { DateWindow, EmailMovement, InboundEmail, NewInboxTransaction } from '../../domain/inbox-transaction/inbox-transaction.js';
import { InboxSenderRepository } from '../../domain/inbox-sender/inbox-sender.repository.js';
import { MerchantRuleRepository } from '../../domain/merchant-rule/merchant-rule.repository.js';
import { UserCalendar } from '../../domain/user-calendar.js';
import { knownBankFor } from '../parsing/banks.js';
import { emailBody } from '../parsing/html-text.js';
import { merchantKey } from '../parsing/merchant-key.js';
import { parseBankEmail } from '../parsing/bank-email-parser.js';
import { normalizeAddress, senderVerdict } from '../parsing/sender.js';
import { isDkimVerified } from '../parsing/dkim-verification.js';
import { matchCategory } from '../parsing/category-matcher.js';

export type IngestOutcome = 'unknown_recipient' | 'verification' | 'not_allowed' | 'blocked' | 'ignored' | 'duplicate' | 'created';

const DAY_MS = 86_400_000;
const MAX_SUBJECT_LENGTH = 200;
const GENERIC_PARSER = 'generic';

type ResolvedCategory = {
  categoryId: string | null;
  description: string;
  isLearned: boolean;
};

type ItemContext = {
  userId: string;
  email: InboundEmail;
  from: string;
  isNewSender: boolean;
  movement: EmailMovement;
  category: ResolvedCategory;
  isoDate: string;
  duplicateOfId: string | null;
};

function aroundDay(isoDate: string): DateWindow {
  const day = new Date(`${isoDate}T00:00:00.000Z`).getTime();
  return { from: new Date(day - DAY_MS), to: new Date(day + DAY_MS) };
}

function toNewInboxTransaction({ userId, email, from, isNewSender, movement, category, isoDate, duplicateOfId }: ItemContext): NewInboxTransaction {
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
  };
}

// Deterministic by design: a per-bank regex parser reads the amount, merchant
// and date; a MerchantRule (if one exists for the sender) always overrides
// the keyword-based category guess. There is no AI step in this pipeline —
// ported as-is from apps/web, which never used one for inbox email parsing.
@Injectable()
export class EmailIngestionService {
  constructor(
    private readonly inboxTransactionRepository: InboxTransactionRepository,
    private readonly inboxSenderRepository: InboxSenderRepository,
    private readonly merchantRuleRepository: MerchantRuleRepository,
    private readonly userCalendar: UserCalendar,
  ) {}

  async ingest(userId: string, email: InboundEmail, body?: string): Promise<IngestOutcome> {
    const from = normalizeAddress(email.from);
    if (!from) return 'blocked';

    const rules = await this.inboxSenderRepository.findRules(userId);
    const verdict = senderVerdict(from, rules);
    if (verdict === 'blocked') return 'blocked';

    const movement = parseBankEmail(body ?? emailBody(email.text, email.html), email.subject);
    if (!movement) return 'ignored';

    const isRepeatedEmail = await this.isRepeatedEmail(userId, movement);
    if (isRepeatedEmail) return 'duplicate';

    const isoDate = await this.transactionDay(userId, movement, email);
    const [category, duplicateOfId] = await Promise.all([
      this.resolveCategory(userId, movement),
      this.inboxTransactionRepository.findSimilarTransactionId(userId, movement, aroundDay(isoDate)),
    ]);

    const item = toNewInboxTransaction({ userId, email, from, isNewSender: verdict === 'unknown', movement, category, isoDate, duplicateOfId });
    return this.inboxTransactionRepository.insert(item);
  }

  private async isRepeatedEmail(userId: string, movement: EmailMovement): Promise<boolean> {
    if (!movement.reference) return false;
    return this.inboxTransactionRepository.hasReference(userId, movement.reference, movement.amount);
  }

  private async transactionDay(userId: string, movement: EmailMovement, email: InboundEmail): Promise<string> {
    if (movement.transactionDate) return movement.transactionDate;
    return this.userCalendar.localDate(userId, email.receivedAt);
  }

  private async resolveCategory(userId: string, movement: EmailMovement): Promise<ResolvedCategory> {
    const learnedRule = await this.findLearnedRule(userId, movement);
    if (learnedRule) {
      return { categoryId: learnedRule.categoryId, description: learnedRule.description, isLearned: true };
    }

    const categories = await this.inboxTransactionRepository.findMatchableCategories(userId);
    return { categoryId: matchCategory(movement.description, categories), description: movement.description, isLearned: false };
  }

  private async findLearnedRule(userId: string, movement: EmailMovement) {
    const key = merchantKey(movement.merchant ?? movement.description);
    if (!key) return null;
    return this.merchantRuleRepository.find(userId, key);
  }
}
