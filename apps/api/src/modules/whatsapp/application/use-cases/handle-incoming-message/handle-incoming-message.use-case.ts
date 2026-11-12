import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../../shared/ai/application/ai.service.js';
import { generateMovementId } from '../../../domain/whatsapp-ledger/movement-id.js';
import { WhatsappLedger, type RecordableMovement, type WhatsappCategory } from '../../../domain/whatsapp-ledger/whatsapp-ledger.js';
import {
  CONVERSATION_TTL_MS,
  emptyConversation,
  emptyPendingMovement,
  type Conversation,
  type PendingMovement,
  type WhatsappLink,
} from '../../../domain/whatsapp-link/whatsapp-link.js';
import { WhatsappLinkRepository } from '../../../domain/whatsapp-link/whatsapp-link.repository.js';
import { WhatsappMessenger } from '../../../domain/whatsapp-messenger/whatsapp-messenger.js';
import { WhatsappMessageRepository } from '../../../domain/whatsapp-message/whatsapp-message.repository.js';
import { buildInterpretationPrompt } from '../../../infrastructure/ai/whatsapp-interpretation.prompt.js';
import { whatsappInterpretationSchema, type WhatsappInterpretation } from '../../../infrastructure/ai/whatsapp-interpretation.schema.js';
import { isUnlinkCommand, parseLinkCommand } from '../../rules/commands.rules.js';
import { matchCategoryByName, resolveCategoryId } from '../../rules/category-resolution.rules.js';
import { mergeMovement, missingField, parseAmount, toRecordableMovement } from '../../rules/movement-draft.rules.js';
import { ConsumeLinkCodeUseCase } from '../consume-link-code/consume-link-code.use-case.js';
import type { HandleIncomingMessageInput } from './handle-incoming-message.input.js';

const AI_OPERATION = 'whatsapp.interpret_message';
const AI_TIMEOUT_MS = 20_000;

const REPLIES = {
  notLinked: 'This number is not linked to any account yet. Open the app and generate a linking code.',
  invalidCode: 'That linking code is invalid or has expired. Generate a new one from the app.',
  linked: 'Your WhatsApp is now linked to your account.',
  unlinked: 'Your WhatsApp has been unlinked from your account.',
  askAmount: 'How much was it?',
  noCategories: "You don't have any categories yet. Create one in the app first.",
  askCategory: (categories: WhatsappCategory[]) => `Which category? ${categories.map((category) => category.name).join(', ')}`,
  recorded: (movement: RecordableMovement) => `Got it, ${movement.type} of ${movement.amount} recorded.`,
  recordFailed: "I couldn't record that, please try again.",
  notUnderstood: 'I didn\'t understand that. Please include an amount, like "lunch 25".',
} as const;

export type HandleIncomingMessageOutcome =
  | 'duplicate'
  | 'linked'
  | 'invalid_link_code'
  | 'unlinked'
  | 'not_linked'
  | 'recorded'
  | 'pending'
  | 'chat'
  | 'not_understood'
  | 'record_failed';

@Injectable()
export class HandleIncomingMessageUseCase {
  constructor(
    private readonly messages: WhatsappMessageRepository,
    private readonly links: WhatsappLinkRepository,
    private readonly ledger: WhatsappLedger,
    private readonly messenger: WhatsappMessenger,
    private readonly ai: AiService,
    private readonly consumeLinkCode: ConsumeLinkCodeUseCase,
  ) {}

  async execute(input: HandleIncomingMessageInput): Promise<HandleIncomingMessageOutcome> {
    const isFirstDelivery = await this.messages.markSeen(input.id);
    if (!isFirstDelivery) return 'duplicate';

    const linkCode = parseLinkCommand(input.text);
    if (linkCode) return this.handleLinkCommand(input.phone, linkCode);

    const link = await this.links.findByPhone(input.phone);
    if (!link) {
      await this.messenger.send(input.phone, REPLIES.notLinked);
      return 'not_linked';
    }

    if (isUnlinkCommand(input.text)) {
      await this.links.unlink(link.userId);
      await this.messenger.send(input.phone, REPLIES.unlinked);
      return 'unlinked';
    }

    return this.converse(link, input);
  }

  private async handleLinkCommand(phone: string, code: string): Promise<HandleIncomingMessageOutcome> {
    const result = await this.consumeLinkCode.execute({ code, phone });
    if (result.status === 'invalid_or_expired') {
      await this.messenger.send(phone, REPLIES.invalidCode);
      return 'invalid_link_code';
    }

    await this.messenger.send(phone, REPLIES.linked);
    return 'linked';
  }

  private async converse(link: WhatsappLink, input: HandleIncomingMessageInput): Promise<HandleIncomingMessageOutcome> {
    const conversation = link.conversation ?? emptyConversation();
    const hasPendingDraft = conversation.pending !== null;
    const pending = conversation.pending ?? emptyPendingMovement();
    const categories = await this.ledger.categories(link.userId);

    const interpreted = await this.interpret(input.text, pending, hasPendingDraft, categories);
    if (interpreted === 'not_understood') {
      await this.messenger.send(input.phone, REPLIES.notUnderstood);
      return 'not_understood';
    }

    if (interpreted.intent === 'chat') {
      await this.messenger.send(input.phone, interpreted.reply ?? REPLIES.notUnderstood);
      return 'chat';
    }

    const categoryId = resolveCategoryId(input.text, interpreted.categoryId, categories);
    const merged = mergeMovement(pending, {
      type: interpreted.type,
      amount: interpreted.amount,
      categoryId,
      description: interpreted.description,
    });

    const recordable = toRecordableMovement(merged, categories);
    if (!recordable) {
      await this.saveConversation(link.userId, conversation, merged);
      const missing = missingField(merged);
      await this.messenger.send(input.phone, missing === 'amount' ? REPLIES.askAmount : this.askCategoryReply(categories));
      return 'pending';
    }

    return this.record(link, input, conversation, recordable);
  }

  private askCategoryReply(categories: WhatsappCategory[]): string {
    return categories.length ? REPLIES.askCategory(categories) : REPLIES.noCategories;
  }

  private async record(
    link: WhatsappLink,
    input: HandleIncomingMessageInput,
    conversation: Conversation,
    recordable: RecordableMovement,
  ): Promise<HandleIncomingMessageOutcome> {
    const movementId = generateMovementId(input.id);
    const recorded = await this.ledger.record(link.userId, movementId, recordable);

    const nextConversation: Conversation = {
      pending: recorded ? null : { ...recordable },
      lastRecordedId: recorded ? movementId : conversation.lastRecordedId,
      history: conversation.history,
    };
    await this.links.saveConversation(link.userId, nextConversation, new Date(Date.now() + CONVERSATION_TTL_MS));
    await this.messenger.send(input.phone, recorded ? REPLIES.recorded(recordable) : REPLIES.recordFailed);
    return recorded ? 'recorded' : 'record_failed';
  }

  private async saveConversation(userId: string, conversation: Conversation, pending: PendingMovement): Promise<void> {
    const next: Conversation = { ...conversation, pending };
    await this.links.saveConversation(userId, next, new Date(Date.now() + CONVERSATION_TTL_MS));
  }

  private async interpret(
    text: string,
    pending: PendingMovement,
    hasPendingDraft: boolean,
    categories: WhatsappCategory[],
  ): Promise<WhatsappInterpretation | 'not_understood'> {
    if (hasPendingDraft) {
      const missing = missingField(pending);
      if (missing === 'amount') {
        const amount = parseAmount(text);
        if (amount !== null) return { intent: 'record', type: null, amount, categoryId: null, description: null, reply: null };
      }
      if (missing === 'category') {
        const categoryId = matchCategoryByName(text, categories);
        if (categoryId) return { intent: 'record', type: null, amount: null, categoryId, description: null, reply: null };
      }
    }

    if (this.ai.isConfigured()) {
      try {
        return await this.ai.generateObject({
          operation: AI_OPERATION,
          prompt: buildInterpretationPrompt({ text, pending, categories }),
          schema: whatsappInterpretationSchema,
          timeoutMs: AI_TIMEOUT_MS,
        });
      } catch {
        // Falls through to the deterministic parser below.
      }
    }

    const amount = parseAmount(text);
    const categoryId = matchCategoryByName(text, categories);
    if (amount === null && categoryId === null) return 'not_understood';
    return { intent: 'record', type: null, amount, categoryId, description: null, reply: null };
  }
}
