import type { CategoryIcon } from "../ai/schemas/category-ai.schema";

export function withCurrentFirst(icons: CategoryIcon[], current: CategoryIcon | null) {
  return current ? [current, ...icons.filter((item) => item.icon !== current.icon)] : icons;
}
