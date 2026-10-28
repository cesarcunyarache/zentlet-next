"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import type { CategoryBase, EditableCategory } from "../types";
import { CategoryFormSheet } from "./category-form-sheet";
import { CategoryGrid } from "./category-grid";

interface CategoriesSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryBase[];
}

export function CategoriesSheet({ isOpen, onOpenChange, categories }: CategoriesSheetProps) {
  const t = useTranslations("categories");
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<EditableCategory | null>(null);
  const isFormOpen = isCreating || Boolean(editing);

  function closeForm() {
    setIsCreating(false);
    setEditing(null);
  }

  return (
    <>
      <Sheet
        isOpen={isOpen && !isFormOpen}
        onOpenChange={onOpenChange}
        title={t("title")}
        hideTitle
      >
        <h2 className="font-display text-app-fg mt-2 mb-6 text-[28px] font-bold tracking-[-0.03em]">
          {t("title")}
        </h2>
        <CategoryGrid
          className="pb-2"
          categories={categories}
          onSelect={setEditing}
          onAdd={() => setIsCreating(true)}
        />
      </Sheet>

      <CategoryFormSheet isOpen={isFormOpen} category={editing} onClose={closeForm} />
    </>
  );
}
