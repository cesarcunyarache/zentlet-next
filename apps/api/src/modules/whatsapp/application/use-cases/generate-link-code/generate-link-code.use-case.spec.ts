import { describe, expect, it } from 'vitest';
import { hashLinkCode, LINK_CODE_TTL_MS, normalizeLinkCode } from '../../../domain/whatsapp-link-code/whatsapp-link-code.js';
import { InMemoryWhatsappLinkCodeRepository } from '../../../infrastructure/in-memory-whatsapp-link-code.repository.js';
import { GenerateLinkCodeUseCase } from './generate-link-code.use-case.js';

describe('GenerateLinkCodeUseCase', () => {
  it('saves only the hash of a freshly generated code, valid for 10 minutes', async () => {
    const linkCodes = new InMemoryWhatsappLinkCodeRepository();
    const useCase = new GenerateLinkCodeUseCase(linkCodes);
    const now = new Date('2026-10-15T12:00:00.000Z');

    const result = await useCase.execute({ userId: 'user-1' }, now);

    expect(result.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(result.expiresAt).toEqual(new Date(now.getTime() + LINK_CODE_TTL_MS));

    const rawCode = normalizeLinkCode(result.code);
    const userId = await linkCodes.consume(hashLinkCode(rawCode), now);
    expect(userId).toBe('user-1');
  });

  it('replaces any code the same user had already requested', async () => {
    const linkCodes = new InMemoryWhatsappLinkCodeRepository();
    const useCase = new GenerateLinkCodeUseCase(linkCodes);
    const now = new Date('2026-10-15T12:00:00.000Z');

    const first = await useCase.execute({ userId: 'user-1' }, now);
    await useCase.execute({ userId: 'user-1' }, now);

    const firstHash = hashLinkCode(normalizeLinkCode(first.code));
    expect(await linkCodes.consume(firstHash, now)).toBeNull();
  });
});
