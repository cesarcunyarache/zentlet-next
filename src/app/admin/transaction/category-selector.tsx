import { Chip } from "@heroui/react";

interface Category {
  id: string;
  name: string;
  emoji: string;
}

const categories: Category[] = [
  { id: "makeup", name: "Maquillaje", emoji: "💄" },
  { id: "car", name: "Auto", emoji: "🚗" },
  { id: "food", name: "Comer", emoji: "🍔" },
  { id: "salary", name: "Salario", emoji: "💰" },
  { id: "shopping", name: "Compras", emoji: "🛍️" },
  { id: "home", name: "Hogar", emoji: "🏠" },
  { id: "health", name: "Salud", emoji: "❤️" },
  { id: "education", name: "Educación", emoji: "📚" },
  { id: "entertainment", name: "Entretenimiento", emoji: "🎵" },
  { id: "utilities", name: "Servicios", emoji: "⚡" },
];

interface CategorySelectorProps {
  selected?: string;
  onSelect: (categoryId: string) => void;
}

export function CategorySelector({
  selected,
  onSelect,
}: CategorySelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 py-4">
      {categories.map((category) => (
        <Chip
          key={category.id}
          onClick={() => onSelect(category.id)}
          className="bg-transparent border border-gray-300 hover:bg-gray-100 transition-colors"
        >
          <span className="text-lg">{category.emoji}</span>
          <Chip.Label className="text-sm font-medium">
            {category.name}
          </Chip.Label>
        </Chip>
      ))}
    </div>
  );
}

export function getCategoryName(categoryId: string): string {
  const category = categories.find((c) => c.id === categoryId);
  return category?.name || "Sin categoría";
}
