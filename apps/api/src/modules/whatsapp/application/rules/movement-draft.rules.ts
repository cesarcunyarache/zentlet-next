import type { RecordableMovement, WhatsappCategory } from '../../domain/whatsapp-ledger/whatsapp-ledger.js';
import type { MovementType, PendingMovement } from '../../domain/whatsapp-link/whatsapp-link.js';

const MAX_AMOUNT = 9_999_999_999;
const AMOUNT_PATTERN = /(-?\d+(?:[.,]\d{1,2})?)/;

export function parseAmount(text: string): number | null {
  const match = AMOUNT_PATTERN.exec(text);
  if (!match) return null;

  const value = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT) return null;

  return Math.round(value * 100) / 100;
}

export function mergeMovement(base: PendingMovement, patch: PendingMovement): PendingMovement {
  return {
    type: patch.type ?? base.type,
    amount: patch.amount ?? base.amount,
    categoryId: patch.categoryId ?? base.categoryId,
    description: base.description ?? patch.description,
  };
}

export function missingField(movement: PendingMovement): 'amount' | 'category' | null {
  if (movement.amount === null) return 'amount';
  if (movement.categoryId === null) return 'category';
  return null;
}

export const defaultMovementType = (type: MovementType | null): MovementType => type ?? 'expense';

// Narrows a draft into a recordable movement once both required fields are
// known, filling the description from the category name when the user never
// gave one.
export function toRecordableMovement(movement: PendingMovement, categories: WhatsappCategory[]): RecordableMovement | null {
  if (movement.amount === null || movement.categoryId === null) return null;

  const description = movement.description ?? categories.find((category) => category.id === movement.categoryId)?.name ?? '';
  return {
    type: defaultMovementType(movement.type),
    amount: movement.amount,
    categoryId: movement.categoryId,
    description,
  };
}
