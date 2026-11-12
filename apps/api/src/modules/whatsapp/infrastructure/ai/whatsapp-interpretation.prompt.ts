import type { WhatsappCategory } from '../../domain/whatsapp-ledger/whatsapp-ledger.js';
import type { PendingMovement } from '../../domain/whatsapp-link/whatsapp-link.js';

export type InterpretationPromptInput = {
  text: string;
  pending: PendingMovement;
  categories: WhatsappCategory[];
};

export function buildInterpretationPrompt({ text, pending, categories }: InterpretationPromptInput): string {
  const categoryList = categories.map((category) => `${category.id}: ${category.name}`).join('\n') || 'none';
  const pendingSummary = [
    `type=${pending.type ?? 'unknown'}`,
    `amount=${pending.amount ?? 'unknown'}`,
    `categoryId=${pending.categoryId ?? 'unknown'}`,
    `description=${pending.description ?? 'unknown'}`,
  ].join(', ');

  return [
    'You read a WhatsApp message from a user tracking personal expenses and incomes.',
    'Decide whether the message records a transaction ("record") or is small talk or a question ("chat").',
    `The user already has a pending, partially filled transaction: ${pendingSummary}.`,
    'Only choose categoryId from this exact list, or null if none fits. Never invent a category id that is not listed:',
    categoryList,
    `Message: "${text}"`,
  ].join('\n');
}
