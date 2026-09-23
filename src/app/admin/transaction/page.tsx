"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCategoryStore } from "@/features/category/stores/category.store";
import { TransactionFormSheet } from "@/features/transaction/components/transaction-form-sheet";
import type { CategoryLike } from "@/features/transaction/types";

/**
 * Vista aislada del formulario de movimiento, útil para trabajarlo sin pasar
 * por la pantalla principal. El registro real ocurre en la hoja que abre el
 * botón + de `/admin`.
 */
export default function TransactionPage() {
  const router = useRouter();
  const { categories: rawCategories } = useCategoryStore();
  const [isOpen, setIsOpen] = useState(true);

  const categories = useMemo<CategoryLike[]>(
    () => (Array.isArray(rawCategories) ? rawCategories : []),
    [rawCategories],
  );

  return (
    <div className="bg-app-bg min-h-dvh">
      <TransactionFormSheet
        isOpen={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) router.push("/admin");
        }}
        categories={categories}
        currency="S/"
        onSubmit={() => router.push("/admin")}
      />
    </div>
  );
}
