"use client";

import { useState } from "react";
import { Sheet } from "@/core/components/ui/sheet";
import { CategoryFormSheet, type EditableCategory } from "@/app/admin/category/CategoryForm";
import { CategoryGrid } from "@/features/category/components/category-grid";
import type { CategoryLike } from "../types";

interface CategoriesSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryLike[];
}

/**
 * Rejilla de categorías del usuario; tocar una abre su edición.
 */
export function CategoriesSheet({
  isOpen,
  onOpenChange,
  categories,
}: CategoriesSheetProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<EditableCategory | null>(null);
  const formOpen = isCreating || Boolean(editing);

  function closeForm() {
    setIsCreating(false);
    setEditing(null);
  }

  return (
    <>
      <Sheet
        isOpen={isOpen && !formOpen}
        onOpenChange={onOpenChange}
        title="Tus categorías"
        hideTitle
      >
        <h2 className="font-display text-app-fg mt-2 mb-6 text-[28px] font-bold tracking-[-0.03em]">
          Tus categorías
        </h2>
        <CategoryGrid
          className="pb-2"
          categories={categories}
          onSelect={setEditing}
          onAdd={() => setIsCreating(true)}
        />
      </Sheet>

      <CategoryFormSheet isOpen={formOpen} category={editing} onClose={closeForm} />
    </>
  );
}
