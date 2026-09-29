"use client";

import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import CategoryForm, { type EditableCategory } from "./category-form";

export function CategoryFormSheet({
  isOpen,
  category,
  initialName,
  onClose,
}: {
  isOpen: boolean;
  category?: EditableCategory | null;
  initialName?: string;
  onClose: () => void;
}) {
  const t = useTranslations("categories.form");

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={t(category ? "edit" : "new")}
      hideTitle
      className="min-h-[70dvh]"
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
