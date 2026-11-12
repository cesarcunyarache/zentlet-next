export abstract class WhatsappLinkCodeRepository {
  // Replaces any code the user already requested: one pending code per user.
  abstract save(userId: string, codeHash: string, expiresAt: Date): Promise<void>;
  // Consumes (deletes) the code if it exists, regardless of expiry, and
  // returns its userId only when it both existed and had not expired yet.
  abstract consume(codeHash: string, now: Date): Promise<string | null>;
}
