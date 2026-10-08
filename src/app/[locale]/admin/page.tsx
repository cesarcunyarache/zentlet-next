"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, Plus, Search, Settings, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useDebounce } from "use-debounce";
import { useTranslations } from "next-intl";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { useCategoryStore } from "@/features/category/stores/category.store";
import { useBudgetStore } from "@/features/budget/stores/budget.store";
import { BudgetSheet } from "@/features/budget/ui/budget-sheet";
import { useBudgetBars } from "@/features/budget/hooks/useBudgetBars";
import { onSyncError } from "@/core/offline/sync-events";
import { SyncStatusPill } from "@/core/offline/sync-status";
import {
  usePendingTransactions,
  useTransactionFeed,
  useTransactionMutations,
  useTransactionSummary,
} from "@/features/transaction/stores/transaction.store";
import { useCurrency } from "@/features/preference/hooks/useCurrency";
import { useToast } from "@/features/transaction/hooks/useToast";
import { SummaryHeader } from "@/features/transaction/ui/summary/summary-header";
import { CategoryStrip } from "@/features/transaction/ui/summary/category-strip";
import type { CategoryTotal } from "@/features/transaction/types";
import { TransactionList } from "@/features/transaction/ui/list/transaction-list";
import { TransactionFormSheet } from "@/features/transaction/ui/form/transaction-form-sheet";
import { VoiceEntry } from "@/features/transaction/ui/voice/voice-entry";
import { ReceiptScan } from "@/features/transaction/ui/receipt/receipt-scan";
import type { TransactionFormValues } from "@/features/transaction/schemas/transaction.schema";
import type { RecurrenceFrequency } from "@/features/recurring/types";
import { TransactionDetailSheet } from "@/features/transaction/ui/detail/transaction-detail-sheet";
import { DeleteTransactionDialog } from "@/features/transaction/ui/detail/delete-transaction-dialog";
import { CategoriesSheet } from "@/features/category/ui/categories-sheet";
import { SettingsSheet } from "@/features/account/ui/settings-sheet";
import { NotificationBell } from "@/features/notification/ui/notification-bell";
import { NotificationSheet } from "@/features/notification/ui/notification-sheet";
import { useNotifications } from "@/features/notification/stores/notification.store";
import { InboxIcon } from "@/features/inbox/ui/inbox-icon";
import { InboxSheet } from "@/features/inbox/ui/inbox-sheet";
import { useInboxItems } from "@/features/inbox/stores/inbox.store";
import { useGmailConnectResult } from "@/features/inbox/hooks/useGmailConnectResult";
import { ToastBubble } from "@/core/components/ui/toast-bubble";
import { Onboarding } from "@/features/onboarding/ui/onboarding";
import { periodRange } from "@/features/transaction/lib/format";
import {
  buildStripData,
  categoryValue,
} from "@/features/transaction/lib/strip-data";
import { track } from "@/lib/observability/client";
import type {
  CategoryLike,
  DateRange,
  Period,
  TTransaction,
  TransactionFilters,
  TransactionType,
} from "@/features/transaction/types";

type Sheet =
  | "new"
  | "categories"
  | "settings"
  | "notifications"
  | "inbox"
  | null;

const ALL_TIME: DateRange = {};

export default function HomePage() {
  const t = useTranslations("transactions");
  const tSync = useTranslations("offline.syncErrors");
  const tBudget = useTranslations("budgets.toast");
  const tNotifications = useTranslations("notifications");
  const { unreadCount } = useNotifications();
  const tInbox = useTranslations("inbox");
  const { items: inboxItems } = useInboxItems();
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

  const { budgets } = useBudgetStore();

  const { createTransaction, updateTransaction, deleteTransaction } =
    useTransactionMutations();
  const syncStateById = usePendingTransactions();
  const { currency, currencyCode, setCurrency } = useCurrency();

  const { message, show: toast } = useToast();

  // un rechazo del servidor llega después de haber cerrado el formulario
  useEffect(() => onSyncError((key) => toast(tSync(key))), [toast, tSync]);

  const [period, setPeriod] = useState<Period>("month");
  const [kind, setKind] = useState<TransactionType | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const [sheet, setSheet] = useState<Sheet>(null);

  useGmailConnectResult((result) => {
    toast(tInbox(`connection.gmail.result.${result}`));
    setSheet("settings");
  });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TTransaction | null>(null);
  const [formDraft, setFormDraft] = useState<Partial<TransactionFormValues>>();
  const [editing, setEditing] = useState<TTransaction | null>(null);
  const [budgetCategory, setBudgetCategory] = useState<CategoryLike | null>(
    null,
  );

  // aparece al instante; se sincroniza por detrás (o en cola sin red)
  function saveTransaction(
    values: TransactionFormValues,
    recurrence: RecurrenceFrequency | null = null,
  ) {
    createTransaction({
      ...values,
      reference: null,
      recurrence: recurrence ?? undefined,
    });
    setCategoryFilter(null);
    setKind(null);
    setPeriod("month");
    toast(
      t(values.type === "expense" ? "toast.expenseSaved" : "toast.incomeSaved"),
    );
  }

  function openForm(
    draft?: Partial<TransactionFormValues>,
    transaction: TTransaction | null = null,
  ) {
    setFormDraft(draft);
    setEditing(transaction);
    setSheet("new");
  }

  function editTransaction(transaction: TTransaction) {
    const { description, amount, type, categoryId, transactionDate } =
      transaction;
    openForm(
      { description, amount, type, categoryId, transactionDate },
      transaction,
    );
  }

  // los filtros se respetan: si deja de cumplirlos, el movimiento sale de la lista
  function saveEdit(transaction: TTransaction, values: TransactionFormValues) {
    updateTransaction(transaction, values);
    toast(t("toast.updated"));
  }

  function removeTransaction(transaction: TTransaction) {
    deleteTransaction(transaction);
    track("transaction_deleted", {});
  }

  const [debouncedQuery] = useDebounce(query.trim(), 300);
  const range = periodRange(period);
  const filters: TransactionFilters = {
    ...range,
    type: kind ?? undefined,
    categoryId: categoryFilter ?? undefined,
    q: debouncedQuery || undefined,
  };

  const feed = useTransactionFeed(filters);
  const detail = detailId
    ? (feed.transactions.find((transaction) => transaction.id === detailId) ??
      null)
    : null;
  const { data: summary } = useTransactionSummary(range);
  const { data: lifetime } = useTransactionSummary(ALL_TIME);

  const expenseTotal = summary?.expenseTotal ?? 0;
  const incomeTotal = summary?.incomeTotal ?? 0;
  const totalsByCategory = summary?.byCategory;

  const valueOfCategory = useCallback(
    (categoryId: string) => categoryValue(totalsByCategory?.[categoryId], kind),
    [totalsByCategory, kind],
  );

  const budgetBars = useBudgetBars(budgets, range);
  const stripData = useMemo<CategoryTotal[]>(
    () =>
      buildStripData({
        categories,
        byCategory: totalsByCategory,
        kind,
        budgetFor: (categoryId) => budgetBars.get(categoryId) ?? null,
      }),
    [categories, totalsByCategory, kind, budgetBars],
  );

  /**
   * La cifra grande sigue al filtro activo: sin filtro es el balance del
   * periodo; con una categoría seleccionada, lo que suma o resta esa
   * categoría.
   */
  const headline = useMemo(() => {
    if (categoryFilter) {
      const value = valueOfCategory(categoryFilter);
      return {
        value,
        label:
          categoriesById.get(categoryFilter)?.name ?? t("headline.category"),
        tone: value > 0 ? ("income" as const) : ("expense" as const),
      };
    }
    if (kind === "expense") {
      return {
        value: -expenseTotal,
        label: t("headline.expenses"),
        tone: "expense" as const,
      };
    }
    if (kind === "income") {
      return {
        value: incomeTotal,
        label: t("headline.income"),
        tone: "income" as const,
      };
    }

    const net = incomeTotal - expenseTotal;
    return {
      value: net,
      label: t("headline.total"),
      tone: net < 0 ? ("neutral" as const) : ("income" as const),
    };
  }, [
    categoryFilter,
    kind,
    expenseTotal,
    incomeTotal,
    valueOfCategory,
    categoriesById,
    t,
  ]);

  const activeCategory = categoryFilter
    ? categoriesById.get(categoryFilter)
    : undefined;

  return (
    <div className="app-shell bg-app-bg text-app-fg min-h-dvh">
      <main className="mx-auto flex max-w-xl flex-col px-5 pt-[calc(14px+env(safe-area-inset-top))] pb-36 sm:px-6">
        <div className="flex h-11 items-center justify-between">
          <SyncStatusPill />
          <div className="flex items-center">
            {inboxItems.length > 0 ? (
              <IconButton
                label={tInbox("label", { count: inboxItems.length })}
                onClick={() => setSheet("inbox")}
              >
                <InboxIcon count={inboxItems.length} />
              </IconButton>
            ) : null}
            <IconButton
              label={tNotifications("label", { count: unreadCount })}
              onClick={() => setSheet("notifications")}
            >
              <NotificationBell hasUnread={unreadCount > 0} />
            </IconButton>
            <IconButton
              label={t("home.settings")}
              onClick={() => setSheet("settings")}
            >
              <Settings className="size-5" strokeWidth={1.7} />
            </IconButton>
          </div>
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
            onLongPress={setBudgetCategory}
          />
        </div>

        <AnimatePresence initial={false}>
          {searching && (
            <motion.label
              // el margen también se anima: si no, al cerrar la lista sube de golpe
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={SPRING_LAYOUT}
              className="bg-app-fill flex items-center gap-2 overflow-hidden rounded-2xl px-3.5"
            >
              <Search className="text-app-muted size-4 shrink-0" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("home.searchPlaceholder")}
                aria-label={t("home.searchLabel")}
                autoFocus
                className="placeholder:text-app-muted h-12 min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none"
              />
            </motion.label>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeCategory && (
            // Alto y margen animados: al quitar el filtro la lista sube suave, sin salto
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={SPRING_LAYOUT}
              className="overflow-hidden"
            >
              <motion.button
                type="button"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                transition={SPRING_LAYOUT}
                onClick={() => setCategoryFilter(null)}
                className="bg-app-fg text-app-surface inline-flex min-h-9 w-fit items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold"
              >
                {activeCategory.icon} {activeCategory.name}
                <X aria-hidden className="size-3.5" strokeWidth={2.4} />
                <span className="sr-only">{t("home.clearCategoryFilter")}</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6">
          {feed.isLoading ? (
            <ListSkeleton />
          ) : feed.isUnavailableOffline ? (
            <p className="text-app-muted m-0 py-10 text-center text-sm">
              {t("home.offlineUnavailable")}
            </p>
          ) : (
            <TransactionList
              transactions={feed.transactions}
              categoriesById={categoriesById}
              currency={currency}
              hasAnyTransaction={
                (lifetime?.count ?? 0) > 0 || feed.transactions.length > 0
              }
              hasMore={feed.hasNextPage}
              isLoadingMore={feed.isFetchingNextPage}
              onEndReached={() => {
                if (feed.hasNextPage && !feed.isFetchingNextPage)
                  void feed.fetchNextPage();
              }}
              syncStateById={syncStateById}
              onSelect={(transaction) => setDetailId(transaction.id)}
              onRequestEdit={editTransaction}
              onRequestDelete={setPendingDelete}
            />
          )}
        </div>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(20px+env(safe-area-inset-bottom))] z-30">
        <div className="mx-auto flex max-w-xl items-center justify-between px-5 sm:px-6">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={SPRING_LAYOUT}
            className="bg-app-surface/90 pointer-events-auto flex items-center gap-1 rounded-full p-1.5 shadow-[0_8px_28px_-10px_color-mix(in_oklch,var(--app-fg)_30%,transparent)] backdrop-blur-xl"
          >
            <IconButton
              label={t("home.categories")}
              onClick={() => setSheet("categories")}
            >
              <LayoutGrid className="size-5" strokeWidth={1.7} />
            </IconButton>
            <IconButton
              label={t(searching ? "home.closeSearch" : "home.search")}
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

          <div className="relative">
            <div className="absolute bottom-full left-1/2 mb-3 flex -translate-x-1/2 flex-col items-center gap-3">
              <ReceiptScan
                categories={categories}
                currency={currency}
                onSave={saveTransaction}
                onEdit={(draft) => openForm(draft)}
              />
              <VoiceEntry
                categories={categories}
                currency={currency}
                onSave={saveTransaction}
                onEdit={(draft) => openForm(draft)}
              />
            </div>
            <motion.button
              type="button"
              aria-label={t("home.create")}
              onClick={() => openForm()}
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.88 }}
              transition={SPRING_PRESS}
              className="action-glass pointer-events-auto text-white grid size-16 place-items-center rounded-full"
            >
              <Plus className="size-7" strokeWidth={2.4} />
            </motion.button>
          </div>
        </div>
      </div>

      <ToastBubble message={message} />

      <Onboarding
        currency={currency}
        hasCategories={categories.length > 0}
        onCreateCategory={() => setSheet("categories")}
      />

      <TransactionFormSheet
        isOpen={sheet === "new"}
        onOpenChange={(open) => setSheet(open ? "new" : null)}
        categories={categories}
        currency={currency}
        draft={formDraft}
        isEditing={Boolean(editing)}
        onSubmit={(values, recurrence) =>
          editing
            ? saveEdit(editing, values)
            : saveTransaction(values, recurrence)
        }
      />

      <DeleteTransactionDialog
        transaction={pendingDelete}
        currency={currency}
        onCancel={() => setPendingDelete(null)}
        onConfirm={(transaction) => {
          setPendingDelete(null);
          removeTransaction(transaction);
          toast(t("toast.deleted"));
        }}
      />

      <TransactionDetailSheet
        transaction={detail}
        category={detail ? categoriesById.get(detail.categoryId) : undefined}
        currency={currency}
        onOpenChange={(open) => !open && setDetailId(null)}
        onEdit={(transaction) => {
          setDetailId(null);
          editTransaction(transaction);
        }}
        onDelete={(id) => {
          setDetailId(null);
          if (detail?.id === id) removeTransaction(detail);
          toast(t("toast.deleted"));
        }}
      />

      <BudgetSheet
        category={budgetCategory}
        currency={currency}
        onClose={() => setBudgetCategory(null)}
        onSaved={() => {
          setBudgetCategory(null);
          toast(tBudget("saved"));
        }}
        onRemoved={() => {
          setBudgetCategory(null);
          toast(tBudget("removed"));
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
        currency={currencyCode}
        transactionCount={lifetime?.count ?? 0}
        onCurrencyChange={setCurrency}
      />

      <NotificationSheet
        isOpen={sheet === "notifications"}
        onOpenChange={(open) => setSheet(open ? "notifications" : null)}
      />

      <InboxSheet
        isOpen={sheet === "inbox"}
        onOpenChange={(open) => setSheet(open ? "inbox" : null)}
        currency={currency}
        categories={categories}
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
        <div
          key={index}
          className="flex min-h-[64px] items-center gap-3.5 px-1 py-2"
        >
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
