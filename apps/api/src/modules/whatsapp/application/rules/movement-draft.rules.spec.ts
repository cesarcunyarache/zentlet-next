import { describe, expect, it } from 'vitest';
import { emptyPendingMovement } from '../../domain/whatsapp-link/whatsapp-link.js';
import { defaultMovementType, mergeMovement, missingField, parseAmount } from './movement-draft.rules.js';

describe('parseAmount', () => {
  it('extracts a leading or embedded amount', () => {
    expect(parseAmount('25')).toBe(25);
    expect(parseAmount('gasté 25.50 en el taxi')).toBe(25.5);
    expect(parseAmount('18,30')).toBe(18.3);
  });

  it('returns null when there is no usable amount', () => {
    expect(parseAmount('hola qué tal')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('0')).toBeNull();
  });
});

describe('mergeMovement', () => {
  it('fills missing fields from the patch without overwriting what is already known', () => {
    const base = { ...emptyPendingMovement(), description: 'Taxi' };
    const patch = { ...emptyPendingMovement(), amount: 18, description: 'ignored' };

    expect(mergeMovement(base, patch)).toEqual({
      type: null,
      amount: 18,
      categoryId: null,
      description: 'Taxi',
    });
  });
});

describe('missingField', () => {
  it('reports amount before category, and nothing once both are set', () => {
    expect(missingField(emptyPendingMovement())).toBe('amount');
    expect(missingField({ ...emptyPendingMovement(), amount: 10 })).toBe('category');
    expect(missingField({ ...emptyPendingMovement(), amount: 10, categoryId: 'food' })).toBeNull();
  });
});

describe('defaultMovementType', () => {
  it('defaults to expense when the type is unknown', () => {
    expect(defaultMovementType(null)).toBe('expense');
    expect(defaultMovementType('income')).toBe('income');
  });
});
