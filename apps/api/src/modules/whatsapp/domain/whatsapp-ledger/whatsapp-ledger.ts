import type { MovementType } from '../whatsapp-link/whatsapp-link.js';

export type WhatsappCategory = {
  id: string;
  name: string;
};

export type RecordableMovement = {
  type: MovementType;
  amount: number;
  categoryId: string;
  description: string;
};

// Owned by this module so it stays self-contained: a future composition root
// adapts it onto the category and transaction modules.
export abstract class WhatsappLedger {
  abstract categories(userId: string): Promise<WhatsappCategory[]>;
  // Returns false when the movement could not be recorded (e.g. rejected by
  // the ledger), leaving the draft pending instead of silently dropping it.
  abstract record(userId: string, movementId: string, movement: RecordableMovement): Promise<boolean>;
}
