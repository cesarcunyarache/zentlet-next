export interface PromptCategory {
  id: string;
  name: string;
}

const MAX_PROMPT_CATEGORIES = 60;
const MAX_CATEGORY_NAME_LENGTH = 40;

export function toPromptCategories(categories: PromptCategory[]): PromptCategory[] {
  return categories.map(({ id, name }) => ({ id, name }));
}

export function limitPromptCategories(categories: PromptCategory[]): PromptCategory[] {
  return categories
    .slice(0, MAX_PROMPT_CATEGORIES)
    .map(({ id, name }) => ({ id, name: name.slice(0, MAX_CATEGORY_NAME_LENGTH) }));
}

export function formatCategoryList(categories: PromptCategory[]) {
  return categories.map(({ id, name }) => `- ${id}: ${name}`).join("\n");
}
