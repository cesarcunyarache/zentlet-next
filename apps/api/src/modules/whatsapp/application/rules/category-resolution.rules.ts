import type { WhatsappCategory } from '../../domain/whatsapp-ledger/whatsapp-ledger.js';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export function matchCategoryByName(text: string, categories: WhatsappCategory[]): string | null {
  const clean = normalize(text);
  if (!clean) return null;

  const exact = categories.find((category) => normalize(category.name) === clean);
  if (exact) return exact.id;

  const named = categories.find((category) => clean.includes(normalize(category.name)));
  return named?.id ?? null;
}

// The AI only suggests; the code decides. A direct name match in the user's
// own text always wins, and an AI suggestion that names no real category is
// discarded instead of ever being recorded.
export function resolveCategoryId(
  text: string,
  aiSuggestedCategoryId: string | null,
  categories: WhatsappCategory[],
): string | null {
  const matched = matchCategoryByName(text, categories);
  if (matched) return matched;
  if (!aiSuggestedCategoryId) return null;

  return categories.some((category) => category.id === aiSuggestedCategoryId) ? aiSuggestedCategoryId : null;
}
