"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import type { EditableCategory } from "../types";
import { CategoryForm } from "./category-form";
import { loadEmojiSearch } from "./category-icon-editor";

const PRELOAD_DELAY_MS = 4000;

interface CategoryFormSheetProps {
  isOpen: boolean;
  category?: EditableCategory | null;
  initialName?: string;
  onClose: () => void;
}

export function CategoryFormSheet({ isOpen, category, initialName, onClose }: CategoryFormSheetProps) {
  const t = useTranslations("categories.form");

  useEffect(() => {
    if (!navigator.onLine) return;
    const timer = setTimeout(() => void loadEmojiSearch().catch(() => undefined), PRELOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={t(category ? "edit" : "new")}
      hideTitle
      bodyClassName="flex flex-col"
    >
      <div className="flex flex-1 flex-col pb-4">
        <CategoryForm
          key={category?.id ?? "new"}
          category={category ?? undefined}
          initialName={initialName}
          onSuccess={onClose}
        />
      </div>
    </Sheet>
  );
}
