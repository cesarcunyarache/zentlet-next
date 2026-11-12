import { describe, expect, it } from 'vitest';
import { matchCategoryByName, resolveCategoryId } from './category-resolution.rules.js';

const CATEGORIES = [
  { id: 'food', name: 'Comida' },
  { id: 'transport', name: 'Transporte' },
];

describe('matchCategoryByName', () => {
  it('matches a category name exactly, ignoring case and accents', () => {
    expect(matchCategoryByName('comida', CATEGORIES)).toBe('food');
    expect(matchCategoryByName('COMIDA', CATEGORIES)).toBe('food');
  });

  it('matches a category name mentioned inside a longer message', () => {
    expect(matchCategoryByName('gasté en transporte hoy', CATEGORIES)).toBe('transport');
  });

  it('returns null when no category name is mentioned', () => {
    expect(matchCategoryByName('cine 30', CATEGORIES)).toBeNull();
    expect(matchCategoryByName('', CATEGORIES)).toBeNull();
  });
});

describe('resolveCategoryId', () => {
  it('prefers a direct category-name match over the AI suggestion', () => {
    expect(resolveCategoryId('comida 25', 'transport', CATEGORIES)).toBe('food');
  });

  it('falls back to the AI suggestion when the text names no category', () => {
    expect(resolveCategoryId('cine 30', 'transport', CATEGORIES)).toBe('transport');
  });

  it('discards an AI suggestion that is not one of the user categories', () => {
    expect(resolveCategoryId('regalo 30', 'invented-id', CATEGORIES)).toBeNull();
  });

  it('returns null when there is no match and no suggestion', () => {
    expect(resolveCategoryId('regalo 30', null, CATEGORIES)).toBeNull();
  });
});
