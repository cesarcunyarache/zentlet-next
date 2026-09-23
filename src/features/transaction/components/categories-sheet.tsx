"use client";

import { useState } from "react";
import { Sheet } from "@/core/components/ui/sheet";
import CategoryForm, { type EditableCategory } from "@/app/admin/category/CategoryForm";
import { CategoryGrid } from "@/features/category/components/category-grid";
import type { CategoryLike } from "../types";

interface CategoriesSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryLike[];
}

/**
 * Rejilla de categorías del usuario; tocar una abre su edición. Las categorías son las
 * reales del usuario; el alta reutiliza el formulario existente.
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

      <Sheet
        isOpen={formOpen}
        onOpenChange={(open) => !open && closeForm()}
        title={editing ? "Editar categoría" : "Nueva categoría"}
        hideTitle
        className="min-h-[70dvh]"
        bodyClassName="flex flex-col"
      >
        <div className="flex flex-1 flex-col pb-4">
          <CategoryForm
            key={editing?.id ?? "new"}
            category={editing ?? undefined}
            onSuccess={closeForm}
          />
        </div>
      </Sheet>
    </>
  );
}
