"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useCategoryStore } from "@/features/category/stores/category.store";
import { CategoryGrid } from "@/features/category/components/category-grid";
import { CategoryFormSheet, type EditableCategory } from "./CategoryForm";

export default function CategoryPage() {
  const { categories, isLoading } = useCategoryStore();
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<EditableCategory | null>(null);
  const formOpen = isCreating || Boolean(editing);

  function closeForm() {
    setIsCreating(false);
    setEditing(null);
  }

  return (
    <div className="bg-app-bg text-app-fg min-h-dvh">
      <main className="mx-auto flex max-w-md flex-col px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-12">
        <Link
          href="/admin"
          aria-label="Volver"
          className="bg-app-fill hover:bg-app-fill-strong grid size-10 place-items-center rounded-full transition-colors"
        >
          <ArrowLeft className="size-5" strokeWidth={1.9} />
        </Link>

        <h1 className="font-display mt-8 mb-8 text-[32px] leading-tight font-bold tracking-[-0.03em]">
          Tus categorías
        </h1>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-x-4 gap-y-5">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} className="bg-app-fill aspect-square animate-pulse rounded-[26px]" />
            ))}
          </div>
        ) : (
          <CategoryGrid
            categories={Array.isArray(categories) ? categories : []}
            onSelect={setEditing}
            onAdd={() => setIsCreating(true)}
          />
        )}
      </main>

      <CategoryFormSheet isOpen={formOpen} category={editing} onClose={closeForm} />
    </div>
  );
}
