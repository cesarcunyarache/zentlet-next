"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, Plus, Search, Settings, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { useCategoryStore } from "@/features/category/stores/category.store";
import { onSyncError } from "@/core/offline/sync-events";
import { SyncStatusPill } from "@/core/offline/sync-status";
import {
  usePendingTransactions,
  useTransactionStore,
} from "@/features/transaction/stores/transaction.store";
import { useCurrency } from "@/features/transaction/hooks/useCurrency";
import { useToast } from "@/features/transaction/hooks/useToast";
import { SummaryHeader } from "@/features/transaction/components/summary-header";
import {
  CategoryStrip,
  type CategoryTotal,
} from "@/features/transaction/components/category-strip";
import { TransactionList } from "@/features/transaction/components/transaction-list";
import { TransactionFormSheet } from "@/features/transaction/components/transaction-form-sheet";
import { TransactionDetailSheet } from "@/features/transaction/components/transaction-detail-sheet";
import { CategoriesSheet } from "@/features/transaction/components/categories-sheet";
import { SettingsSheet } from "@/features/transaction/components/settings-sheet";
import { ToastBubble } from "@/core/components/ui/toast-bubble";
import { parseISODate, today } from "@/features/transaction/lib/format";
import type {
  CategoryLike,
  Period,
  TTransaction,
  TransactionType,
} from "@/features/transaction/types";

type Sheet = "new" | "categories" | "settings" | null;

export default function HomePage() {
  const { categories: rawCategories } = useCategoryStore();

  const categories = useMemo<CategoryLike[]>(
    () =>
      Array.isArray(rawCategories)
        ? rawCategories.map((c: CategoryLike) => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color,
          }))
        : [],
    [rawCategories],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const { transactions, isLoading, createTransaction, deleteTransaction } =
    useTransactionStore();
  const syncStateById = usePendingTransactions();
  const { currency, setCurrency } = useCurrency();

  const { message, show: toast } = useToast();

  // un rechazo del servidor llega después de haber cerrado el formulario
  useEffect(() => onSyncError(toast), [toast]);

  const [period, setPeriod] = useState<Period>("month");
  const [kind, setKind] = useState<TransactionType | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const [sheet, setSheet] = useState<Sheet>(null);
  const [detail, setDetail] = useState<TTransaction | null>(null);

  /** Movimientos del periodo, antes de los filtros de la vista. */
  const periodRows = useMemo(() => {
    if (period === "all") return transactions;

    const now = today();
    let month = now.getMonth();
    let year = now.getFullYear();
    if (period === "previous") {
      month -= 1;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
    }

    return transactions.filter((tx) => {
      const date = parseISODate(tx.transactionDate);
      return date.getMonth() === month && date.getFullYear() === year;
    });
  }, [transactions, period]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return periodRows
      .filter((tx) => {
        if (kind && tx.type !== kind) return false;
        if (categoryFilter && tx.categoryId !== categoryFilter) return false;
        if (q) {
          const categoryName = categoriesById.get(tx.categoryId)?.name ?? "";
          if (!`${tx.description} ${categoryName}`.toLowerCase().includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  }, [periodRows, kind, categoryFilter, query, categoriesById]);

  const { expenseTotal, incomeTotal, expenseByCategory } =
    useMemo(() => {
      let expense = 0;
      let income = 0;
      const byExpense = new Map<string, number>();

      for (const tx of periodRows) {
        if (tx.type === "expense") {
          expense += tx.amount;
          byExpense.set(
            tx.categoryId,
            (byExpense.get(tx.categoryId) ?? 0) + tx.amount,
          );
        } else {
          income += tx.amount;
        }
      }

      return {
        expenseTotal: expense,
        incomeTotal: income,
        expenseByCategory: byExpense,
      };
    }, [periodRows]);

  const stripData = useMemo<CategoryTotal[]>(
    () =>
      categories
        .map((category) => ({
          category,
          total: expenseByCategory.get(category.id) ?? 0,
        }))
        .sort((a, b) => b.total - a.total),
    [categories, expenseByCategory],
  );

  /**
   * La cifra grande sigue al filtro activo: sin filtro es el balance del
   * periodo; con una categoría seleccionada, su gasto.
   */
  const headline = useMemo(() => {
    if (categoryFilter) {
      return {
        value: -(expenseByCategory.get(categoryFilter) ?? 0),
        label: categoriesById.get(categoryFilter)?.name ?? "Categoría",
        tone: "expense" as const,
      };
    }
    if (kind === "expense") {
      return { value: -expenseTotal, label: "Gastos", tone: "expense" as const };
    }
    if (kind === "income") {
      return { value: incomeTotal, label: "Ingresos", tone: "income" as const };
    }

    const net = incomeTotal - expenseTotal;
    return {
      value: net,
      label: "Total",
      tone: net < 0 ? ("neutral" as const) : ("income" as const),
    };
  }, [
    categoryFilter,
    kind,
    expenseTotal,
    incomeTotal,
    expenseByCategory,
    categoriesById,
  ]);

  const activeCategory = categoryFilter
    ? categoriesById.get(categoryFilter)
    : undefined;

  return (
    <div className="app-shell bg-app-bg text-app-fg min-h-dvh">
      <main className="mx-auto flex max-w-xl flex-col px-5 pt-[calc(14px+env(safe-area-inset-top))] pb-36 sm:px-6">
        <div className="flex h-11 items-center justify-between">
          <SyncStatusPill />
          <IconButton label="Ajustes" onClick={() => setSheet("settings")}>
            <Settings className="size-5" strokeWidth={1.7} />
          </IconButton>
        </div>

        <SummaryHeader
          currency={currency}
          headline={headline.value}
          headlineLabel={headline.label}
          tone={headline.tone}
          expenseTotal={expenseTotal}
          incomeTotal={incomeTotal}
          period={period}
          kind={kind}
          onPeriodChange={(next) => {
            setPeriod(next);
            setCategoryFilter(null);
          }}
          onKindChange={setKind}
        />

        <div className="mt-8">
          <CategoryStrip
            data={stripData}
            currency={currency}
            selectedId={categoryFilter}
            onSelect={setCategoryFilter}
          />
        </div>

        <AnimatePresence initial={false}>
          {searching && (
            <motion.label
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={SPRING_LAYOUT}
              className="bg-app-fill mt-6 flex items-center gap-2 overflow-hidden rounded-2xl px-3.5"
            >
              <Search className="text-app-muted size-4 shrink-0" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre o categoría"
                aria-label="Buscar movimientos"
                autoFocus
                className="placeholder:text-app-muted h-12 min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none"
              />
            </motion.label>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeCategory && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setCategoryFilter(null)}
              className="bg-app-fg text-app-surface mt-6 inline-flex min-h-9 w-fit items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold"
            >
              {activeCategory.icon} {activeCategory.name}
              <X aria-hidden className="size-3.5" strokeWidth={2.4} />
              <span className="sr-only">Quitar filtro de categoría</span>
            </motion.button>
          )}
        </AnimatePresence>

        <div className="mt-6">
          {isLoading ? (
            <ListSkeleton />
          ) : (
            <TransactionList
              transactions={visibleRows}
              categoriesById={categoriesById}
              currency={currency}
              hasAnyTransaction={transactions.length > 0}
              syncStateById={syncStateById}
              onSelect={setDetail}
            />
          )}
        </div>
      </main>

      {/* barra flotante: a la izquierda navegar, a la derecha registrar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(20px+env(safe-area-inset-bottom))] z-30">
        <div className="mx-auto flex max-w-xl items-center justify-between px-5 sm:px-6">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={SPRING_LAYOUT}
            className="bg-app-surface/90 pointer-events-auto flex items-center gap-1 rounded-full p-1.5 shadow-[0_8px_28px_-10px_color-mix(in_oklch,var(--app-fg)_30%,transparent)] backdrop-blur-xl"
          >
            <IconButton label="Categorías" onClick={() => setSheet("categories")}>
              <LayoutGrid className="size-5" strokeWidth={1.7} />
            </IconButton>
            <IconButton
              label={searching ? "Cerrar búsqueda" : "Buscar"}
              pressed={searching}
              onClick={() => {
                if (searching) setQuery("");
                setSearching((value) => !value);
              }}
            >
              {searching ? (
                <X className="size-5" strokeWidth={1.8} />
              ) : (
                <Search className="size-5" strokeWidth={1.7} />
              )}
            </IconButton>
          </motion.div>

          <motion.button
            type="button"
            aria-label="Registrar movimiento"
            onClick={() => setSheet("new")}
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.88 }}
            transition={SPRING_PRESS}
            className="bg-app-expense text-app-surface pointer-events-auto grid size-16 place-items-center rounded-full shadow-[var(--shadow-fab)]"
          >
            <Plus className="size-7" strokeWidth={2.4} />
          </motion.button>
        </div>
      </div>

      <ToastBubble message={message} />

      <TransactionFormSheet
        isOpen={sheet === "new"}
        onOpenChange={(open) => setSheet(open ? "new" : null)}
        categories={categories}
        currency={currency}
        onSubmit={(values) => {
          // aparece al instante; se sincroniza por detrás (o en cola sin red)
          createTransaction({ ...values, reference: null });
          setCategoryFilter(null);
          setKind(null);
          setPeriod("month");
          toast(
            values.type === "expense" ? "Gasto registrado" : "Ingreso registrado",
          );
        }}
      />

      <TransactionDetailSheet
        transaction={detail}
        category={detail ? categoriesById.get(detail.categoryId) : undefined}
        currency={currency}
        onOpenChange={(open) => !open && setDetail(null)}
        onDelete={(id) => {
          setDetail(null);
          deleteTransaction(id);
          toast("Movimiento eliminado");
        }}
      />

      <CategoriesSheet
        isOpen={sheet === "categories"}
        onOpenChange={(open) => setSheet(open ? "categories" : null)}
        categories={categories}
      />

      <SettingsSheet
        isOpen={sheet === "settings"}
        onOpenChange={(open) => setSheet(open ? "settings" : null)}
        currency={currency}
        transactionCount={transactions.length}
        onCurrencyChange={setCurrency}
      />
    </div>
  );
}

/** Primera carga sin nada guardado en el dispositivo: filas fantasma. */
function ListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-1">
      <span className="bg-app-fill mb-2 ml-1 h-3 w-16 animate-pulse rounded-full" />
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex min-h-[64px] items-center gap-3.5 px-1 py-2">
          <span className="bg-app-fill size-12 shrink-0 animate-pulse rounded-full" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="bg-app-fill h-2.5 w-20 animate-pulse rounded-full" />
            <span className="bg-app-fill h-3.5 w-36 animate-pulse rounded-full" />
          </span>
          <span className="bg-app-fill h-3.5 w-16 animate-pulse rounded-full" />
        </div>
      ))}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      transition={SPRING_PRESS}
      className="text-app-muted hover:bg-app-fill hover:text-app-fg aria-pressed:bg-app-fill aria-pressed:text-app-fg grid size-11 place-items-center rounded-full transition-colors"
    >
      {children}
    </motion.button>
  );
}
