import { describe, expect, it } from 'vitest';
import { generateMovementId } from './movement-id.js';

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateMovementId', () => {
  it('is deterministic for the same WhatsApp message id', () => {
    expect(generateMovementId('wamid.X')).toBe(generateMovementId('wamid.X'));
  });

  it('differs for different message ids', () => {
    expect(generateMovementId('wamid.X')).not.toBe(generateMovementId('wamid.Y'));
  });

  it('produces a valid UUID that Prisma accepts for a Transaction.id column', () => {
    expect(generateMovementId('wamid.X')).toMatch(UUID_SHAPE);
  });
});
