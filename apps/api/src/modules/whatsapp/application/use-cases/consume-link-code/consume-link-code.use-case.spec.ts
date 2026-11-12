import { describe, expect, it } from 'vitest';
import { hashLinkCode, LINK_CODE_TTL_MS } from '../../../domain/whatsapp-link-code/whatsapp-link-code.js';
import { InMemoryWhatsappLinkCodeRepository } from '../../../infrastructure/in-memory-whatsapp-link-code.repository.js';
import { InMemoryWhatsappLinkRepository } from '../../../infrastructure/in-memory-whatsapp-link.repository.js';
import { ConsumeLinkCodeUseCase } from './consume-link-code.use-case.js';

const NOW = new Date('2026-10-15T12:00:00.000Z');

function setup() {
  const linkCodes = new InMemoryWhatsappLinkCodeRepository();
  const links = new InMemoryWhatsappLinkRepository();
  const useCase = new ConsumeLinkCodeUseCase(linkCodes, links);
  return { linkCodes, links, useCase };
}

describe('ConsumeLinkCodeUseCase', () => {
  it('links the phone to the code owner when the code is valid', async () => {
    const { linkCodes, links, useCase } = setup();
    await linkCodes.save('user-1', hashLinkCode('ABCDEFGH'), new Date(NOW.getTime() + LINK_CODE_TTL_MS));

    const result = await useCase.execute({ code: 'ABCDEFGH', phone: '51987654321' }, NOW);

    expect(result).toEqual({ status: 'linked', userId: 'user-1' });
    expect(await links.findByUserId('user-1')).toMatchObject({ userId: 'user-1', phone: '51987654321' });
  });

  it('rejects an unknown code', async () => {
    const { useCase } = setup();
    expect(await useCase.execute({ code: 'NOPE0000', phone: '51987654321' }, NOW)).toEqual({ status: 'invalid_or_expired' });
  });

  it('rejects an expired code and still consumes it', async () => {
    const { linkCodes, useCase } = setup();
    const codeHash = hashLinkCode('ABCDEFGH');
    await linkCodes.save('user-1', codeHash, new Date(NOW.getTime() - 1));

    expect(await useCase.execute({ code: 'ABCDEFGH', phone: '51987654321' }, NOW)).toEqual({ status: 'invalid_or_expired' });
    expect(await linkCodes.consume(codeHash, NOW)).toBeNull();
  });

  it('rejects a code that was already consumed once', async () => {
    const { linkCodes, useCase } = setup();
    await linkCodes.save('user-1', hashLinkCode('ABCDEFGH'), new Date(NOW.getTime() + LINK_CODE_TTL_MS));

    await useCase.execute({ code: 'ABCDEFGH', phone: '51987654321' }, NOW);
    expect(await useCase.execute({ code: 'ABCDEFGH', phone: '51987654322' }, NOW)).toEqual({ status: 'invalid_or_expired' });
  });

  it('moves the phone from whoever held it to the new code owner', async () => {
    const { linkCodes, links, useCase } = setup();
    await links.link('old-user', '51987654321');
    await linkCodes.save('new-user', hashLinkCode('ABCDEFGH'), new Date(NOW.getTime() + LINK_CODE_TTL_MS));

    await useCase.execute({ code: 'ABCDEFGH', phone: '51987654321' }, NOW);

    expect(await links.findByUserId('old-user')).toBeNull();
    expect(await links.findByPhone('51987654321')).toMatchObject({ userId: 'new-user' });
  });
});
