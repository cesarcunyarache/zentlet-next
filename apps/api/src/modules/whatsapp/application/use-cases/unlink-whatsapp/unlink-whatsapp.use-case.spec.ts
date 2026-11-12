import { describe, expect, it } from 'vitest';
import { InMemoryWhatsappLinkRepository } from '../../../infrastructure/in-memory-whatsapp-link.repository.js';
import { UnlinkWhatsappUseCase } from './unlink-whatsapp.use-case.js';

describe('UnlinkWhatsappUseCase', () => {
  it('removes an existing link', async () => {
    const links = new InMemoryWhatsappLinkRepository();
    await links.link('user-1', '51987654321');
    const useCase = new UnlinkWhatsappUseCase(links);

    expect(await useCase.execute({ userId: 'user-1' })).toEqual({ status: 'unlinked' });
    expect(await links.findByUserId('user-1')).toBeNull();
  });

  it('reports when the user had no link', async () => {
    const links = new InMemoryWhatsappLinkRepository();
    const useCase = new UnlinkWhatsappUseCase(links);

    expect(await useCase.execute({ userId: 'user-1' })).toEqual({ status: 'not_linked' });
  });
});
