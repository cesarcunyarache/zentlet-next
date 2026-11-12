import { describe, expect, it } from 'vitest';
import { hashLinkCode, LINK_CODE_TTL_MS } from '../../../domain/whatsapp-link-code/whatsapp-link-code.js';
import { InMemoryWhatsappLinkCodeRepository } from '../../../infrastructure/in-memory-whatsapp-link-code.repository.js';
import { InMemoryWhatsappLinkRepository } from '../../../infrastructure/in-memory-whatsapp-link.repository.js';
import { InMemoryWhatsappMessageRepository } from '../../../infrastructure/in-memory-whatsapp-message.repository.js';
import { ConsumeLinkCodeUseCase } from '../consume-link-code/consume-link-code.use-case.js';
import { fakeAiService, FakeWhatsappLedger, FakeWhatsappMessenger } from './handle-incoming-message.fakes.js';
import { HandleIncomingMessageUseCase } from './handle-incoming-message.use-case.js';

const USER = 'user-1';
const PHONE = '51987654321';
const CATEGORIES = [
  { id: 'food', name: 'Comida' },
  { id: 'transport', name: 'Transporte' },
];

function setup(options: { aiOutputs?: unknown[]; aiConfigured?: boolean; aiShouldFail?: boolean; recordResult?: boolean } = {}) {
  const messages = new InMemoryWhatsappMessageRepository();
  const links = new InMemoryWhatsappLinkRepository();
  const linkCodes = new InMemoryWhatsappLinkCodeRepository();
  const ledger = new FakeWhatsappLedger(CATEGORIES, options.recordResult ?? true);
  const messenger = new FakeWhatsappMessenger();
  const { ai, generator } = fakeAiService(options.aiOutputs ?? [], {
    configured: options.aiConfigured ?? true,
    shouldFail: options.aiShouldFail ?? false,
  });
  const consumeLinkCode = new ConsumeLinkCodeUseCase(linkCodes, links);
  const useCase = new HandleIncomingMessageUseCase(messages, links, ledger, messenger, ai, consumeLinkCode);
  return { messages, links, linkCodes, ledger, messenger, generator, consumeLinkCode, useCase };
}

describe('HandleIncomingMessageUseCase · deduplication', () => {
  it('ignores a message id delivered more than once', async () => {
    const { useCase, links, ledger, messenger } = setup({
      aiOutputs: [{ intent: 'record', type: 'expense', amount: 25, categoryId: 'food', description: 'Lunch', reply: null }],
    });
    await links.link(USER, PHONE);
    const message = { id: 'wamid.1', phone: PHONE, text: 'lunch 25' };

    expect(await useCase.execute(message)).toBe('recorded');
    expect(await useCase.execute(message)).toBe('duplicate');
    expect(ledger.recorded).toHaveLength(1);
    expect(messenger.sent).toHaveLength(1);
  });
});

describe('HandleIncomingMessageUseCase · linking', () => {
  it('links the phone with a valid code', async () => {
    const { useCase, linkCodes, links, messenger } = setup();
    await linkCodes.save(USER, hashLinkCode('ABCDEFGH'), new Date(Date.now() + LINK_CODE_TTL_MS));

    const outcome = await useCase.execute({ id: 'wamid.1', phone: PHONE, text: 'link ABCD-EFGH' });

    expect(outcome).toBe('linked');
    expect(await links.findByPhone(PHONE)).toMatchObject({ userId: USER });
    expect(messenger.sent).toHaveLength(1);
  });

  it('rejects an invalid or expired code', async () => {
    const { useCase, messenger } = setup();

    const outcome = await useCase.execute({ id: 'wamid.1', phone: PHONE, text: 'link ABCD-EFGH' });

    expect(outcome).toBe('invalid_link_code');
    expect(messenger.sent).toHaveLength(1);
  });

  it('replies with a linking prompt for an unknown number', async () => {
    const { useCase, ledger, messenger } = setup();

    const outcome = await useCase.execute({ id: 'wamid.1', phone: PHONE, text: 'lunch 25' });

    expect(outcome).toBe('not_linked');
    expect(ledger.recorded).toHaveLength(0);
    expect(messenger.sent).toHaveLength(1);
  });

  it('unlinks the number on the unlink command', async () => {
    const { useCase, links, messenger } = setup();
    await links.link(USER, PHONE);

    expect(await useCase.execute({ id: 'wamid.1', phone: PHONE, text: 'unlink' })).toBe('unlinked');
    expect(await links.findByUserId(USER)).toBeNull();
    expect(messenger.sent).toHaveLength(1);
  });
});

describe('HandleIncomingMessageUseCase · recording an expense', () => {
  it('records a complete movement reported by the AI in one message', async () => {
    const { useCase, links, ledger, messenger } = setup({
      aiOutputs: [{ intent: 'record', type: 'expense', amount: 25, categoryId: 'food', description: 'Lunch', reply: null }],
    });
    await links.link(USER, PHONE);

    const outcome = await useCase.execute({ id: 'wamid.1', phone: PHONE, text: 'lunch 25' });

    expect(outcome).toBe('recorded');
    expect(ledger.recorded).toEqual([
      { userId: USER, movementId: expect.any(String), movement: { type: 'expense', amount: 25, categoryId: 'food', description: 'Lunch' } },
    ]);
    expect(messenger.sent.at(-1)?.text).toContain('25');
  });

  it('asks for the amount and then the category across turns, recording with no further AI calls', async () => {
    const { useCase, links, ledger, messenger, generator } = setup({
      aiOutputs: [{ intent: 'record', type: null, amount: null, categoryId: null, description: 'Taxi', reply: null }],
    });
    await links.link(USER, PHONE);

    await useCase.execute({ id: 'wamid.1', phone: PHONE, text: 'taxi' });
    expect(messenger.sent.at(-1)?.text).toContain('How much');

    await useCase.execute({ id: 'wamid.2', phone: PHONE, text: '18' });
    expect(messenger.sent.at(-1)?.text).toContain('category');

    const outcome = await useCase.execute({ id: 'wamid.3', phone: PHONE, text: 'transporte' });

    expect(outcome).toBe('recorded');
    expect(ledger.recorded).toEqual([
      { userId: USER, movementId: expect.any(String), movement: { type: 'expense', amount: 18, categoryId: 'transport', description: 'Taxi' } },
    ]);
    expect(generator?.calls).toBe(1);
  });

  it('discards a category id invented by the AI and asks for a real one', async () => {
    const { useCase, links, ledger, messenger } = setup({
      aiOutputs: [{ intent: 'record', type: 'expense', amount: 30, categoryId: 'does-not-exist', description: 'Gift', reply: null }],
    });
    await links.link(USER, PHONE);

    const outcome = await useCase.execute({ id: 'wamid.1', phone: PHONE, text: 'gift 30' });

    expect(outcome).toBe('pending');
    expect(ledger.recorded).toHaveLength(0);
    expect(messenger.sent.at(-1)?.text).toContain('category');
  });

  it('prefers a category named in the text over whatever the AI suggested', async () => {
    const { useCase, links, ledger } = setup({
      aiOutputs: [{ intent: 'record', type: 'expense', amount: 25, categoryId: 'transport', description: null, reply: null }],
    });
    await links.link(USER, PHONE);

    await useCase.execute({ id: 'wamid.1', phone: PHONE, text: 'comida 25' });

    expect(ledger.recorded).toEqual([
      { userId: USER, movementId: expect.any(String), movement: { type: 'expense', amount: 25, categoryId: 'food', description: 'Comida' } },
    ]);
  });

  it('falls back to the deterministic parser when the AI call fails', async () => {
    const { useCase, links, ledger } = setup({ aiShouldFail: true });
    await links.link(USER, PHONE);

    const outcome = await useCase.execute({ id: 'wamid.1', phone: PHONE, text: 'comida 25' });

    expect(outcome).toBe('recorded');
    expect(ledger.recorded).toEqual([
      { userId: USER, movementId: expect.any(String), movement: { type: 'expense', amount: 25, categoryId: 'food', description: 'Comida' } },
    ]);
  });

  it('reports it did not understand when there is no AI and no amount or category in the text', async () => {
    const { useCase, links, ledger, messenger } = setup({ aiConfigured: false });
    await links.link(USER, PHONE);

    const outcome = await useCase.execute({ id: 'wamid.1', phone: PHONE, text: 'hello there' });

    expect(outcome).toBe('not_understood');
    expect(ledger.recorded).toHaveLength(0);
    expect(messenger.sent).toHaveLength(1);
  });
});

describe('HandleIncomingMessageUseCase · chat', () => {
  it('relays the AI reply for small talk without recording anything', async () => {
    const { useCase, links, ledger, messenger } = setup({
      aiOutputs: [{ intent: 'chat', type: null, amount: null, categoryId: null, description: null, reply: 'Hi there!' }],
    });
    await links.link(USER, PHONE);

    const outcome = await useCase.execute({ id: 'wamid.1', phone: PHONE, text: 'hi!' });

    expect(outcome).toBe('chat');
    expect(ledger.recorded).toHaveLength(0);
    expect(messenger.sent).toEqual([{ phone: PHONE, text: 'Hi there!' }]);
  });
});
