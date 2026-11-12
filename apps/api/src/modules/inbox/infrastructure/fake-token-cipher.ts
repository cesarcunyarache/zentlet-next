import { TokenCipher } from '../domain/token-cipher.js';

export class FakeTokenCipher extends TokenCipher {
  isConfigured(): boolean {
    return true;
  }

  seal(plain: string): string {
    return `sealed:${plain}`;
  }

  open(sealed: string): string {
    return `open:${sealed}`;
  }
}
