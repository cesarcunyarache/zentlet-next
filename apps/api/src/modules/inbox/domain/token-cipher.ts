// Seals a Gmail refresh token before it is persisted, and opens it back up
// when a use case needs to call Google with it.
export abstract class TokenCipher {
  abstract seal(plain: string): string;
  abstract open(sealed: string): string;
  abstract isConfigured(): boolean;
}
