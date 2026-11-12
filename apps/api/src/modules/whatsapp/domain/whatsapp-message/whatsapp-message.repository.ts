export abstract class WhatsappMessageRepository {
  // WhatsApp delivers at-least-once: records the message id the first time it
  // is seen and returns true, or returns false if it was already recorded.
  abstract markSeen(id: string): Promise<boolean>;
}
