"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/core/hooks/useToast";
import { ToastBubble } from "@/core/components/ui/toast-bubble";
import { onSyncError } from "@/core/offline/sync-events";
import { useCurrency } from "@/features/preference/hooks/useCurrency";
import { useNotifications } from "@/features/notification/stores/notification.store";
import { NotificationSheet } from "@/features/notification/ui/notification-sheet";
import { useInboxItems } from "@/features/inbox/stores/inbox.store";
import { useGmailConnectResult } from "@/features/inbox/hooks/useGmailConnectResult";
import { InboxSheet } from "@/features/inbox/ui/inbox-sheet";
import { ListFilterSelect } from "@/features/list/ui/filter/list-filter-select";
import { ListActionsMenu } from "@/features/list/ui/actions/list-actions-menu";
import { TransactionListField } from "@/features/list/ui/picker/transaction-list-field";
import { usePendingTransactions, useTransactionFeed } from "@/features/transaction/stores/transaction.store";
import { SummaryHeader } from "@/features/transaction/ui/summary/summary-header";
import { CategoryStrip } from "@/features/transaction/ui/summary/category-strip";
import { TransactionFormSheet } from "@/features/transaction/ui/form/transaction-form-sheet";
import { TransactionDetailSheet } from "@/features/transaction/ui/detail/transaction-detail-sheet";
import { DeleteTransactionDialog } from "@/features/transaction/ui/detail/delete-transaction-dialog";
import { BudgetSheet } from "@/features/budget/ui/budget-sheet";
import { CategoriesSheet } from "@/features/category/ui/categories-sheet";
import { SettingsSheet } from "@/features/account/ui/settings-sheet";
import { Onboarding } from "@/features/onboarding/ui/onboarding";
import { useHomeCategories } from "@/features/home/hooks/useHomeCategories";
import { useHomeFilters } from "@/features/home/hooks/useHomeFilters";
import { useHomeSheets } from "@/features/home/hooks/useHomeSheets";
import { useHomeSummary } from "@/features/home/hooks/useHomeSummary";
import { useHomeTransactions } from "@/features/home/hooks/useHomeTransactions";
import { useBudgetEditor } from "@/features/home/hooks/useBudgetEditor";
import { HomeTopBar } from "@/features/home/ui/home-top-bar";
import { HomeSearchField } from "@/features/home/ui/home-search-field";
import { ActiveCategoryChip } from "@/features/home/ui/active-category-chip";
import { HomeFeed } from "@/features/home/ui/home-feed";
import { HomeActionBar } from "@/features/home/ui/home-action-bar";

export default function HomePage() {
  const tSync = useTranslations("offline.syncErrors");
  const tInbox = useTranslations("inbox");
  const { message, show: toast } = useToast();
  const { currency, currencyCode, setCurrency } = useCurrency();
  const { unreadCount } = useNotifications();
  const { items: inboxItems } = useInboxItems();
  const syncStateById = usePendingTransactions();

  const { categories, categoriesById } = useHomeCategories();
  const filters = useHomeFilters();
  const sheets = useHomeSheets();
  const transactions = useHomeTransactions({
    listId: filters.listId,
    openForm: () => sheets.open("new"),
    onCreated: filters.showThisMonth,
    toast,
  });
  const budgetEditor = useBudgetEditor(toast);

  const feed = useTransactionFeed(filters.feedFilters);
  const summary = useHomeSummary({
    summaryFilters: filters.summaryFilters,
    range: filters.range,
    listId: filters.listId,
    kind: filters.kind,
    categoryId: filters.categoryId,
    categories,
    categoriesById,
  });

  const detail = feed.transactions.find((transaction) => transaction.id === transactions.detailId) ?? null;
  const activeCategory = filters.categoryId ? categoriesById.get(filters.categoryId) : undefined;
  const isSharedList = Boolean(filters.selectedList && !filters.selectedList.isPrivate);

  // un rechazo del servidor llega después de haber cerrado el formulario
  useEffect(() => onSyncError((key) => toast(tSync(key))), [toast, tSync]);

  useGmailConnectResult((result) => {
    toast(tInbox(`connection.gmail.result.${result}`));
    sheets.open("settings");
  });

  return (
    <div className="app-shell bg-app-bg text-app-fg min-h-dvh">
      <main className="mx-auto flex max-w-xl flex-col px-5 pt-[calc(14px+env(safe-area-inset-top))] pb-36 sm:px-6">
        <HomeTopBar
          pendingInboxCount={inboxItems.length}
          unreadNotifications={unreadCount}
          onOpen={sheets.open}
        />

        <SummaryHeader
          currency={currency}
          headline={summary.headline.value}
          headlineLabel={summary.headline.label}
          tone={summary.headline.tone}
          expenseTotal={summary.expenseTotal}
          incomeTotal={summary.incomeTotal}
          period={filters.period}
          kind={filters.kind}
          onPeriodChange={filters.changePeriod}
          onKindChange={filters.changeKind}
        >
          <ListFilterSelect value={filters.listId} onChange={filters.changeList} />
          {isSharedList && filters.selectedList ? (
            <ListActionsMenu list={filters.selectedList} onToast={toast} />
          ) : null}
        </SummaryHeader>

        <div className="mt-8">
          <CategoryStrip
            data={summary.stripData}
            currency={currency}
            selectedId={filters.categoryId}
            onSelect={filters.changeCategory}
            onLongPress={budgetEditor.open}
          />
        </div>

        <HomeSearchField isOpen={filters.isSearching} query={filters.query} onQueryChange={filters.changeQuery} />
        <ActiveCategoryChip category={activeCategory} onClear={() => filters.changeCategory(null)} />

        <div className="mt-6">
          <HomeFeed
            feed={feed}
            categoriesById={categoriesById}
            currency={currency}
            hasAnyTransaction={summary.lifetimeCount > 0 || feed.transactions.length > 0}
            syncStateById={syncStateById}
            onSelect={(transaction) => transactions.showDetail(transaction.id)}
            onRequestEdit={transactions.startEditing}
            onRequestDelete={transactions.askToDelete}
          />
        </div>
      </main>

      <HomeActionBar
        categories={categories}
        currency={currency}
        isSearching={filters.isSearching}
        onOpenCategories={() => sheets.open("categories")}
        onToggleSearch={filters.toggleSearch}
        onCreate={transactions.startCreating}
        onQuickSave={(values) => transactions.create(values)}
      />

      <ToastBubble message={message} />

      <Onboarding
        currency={currency}
        hasCategories={categories.length > 0}
        onCreateCategory={() => sheets.open("categories")}
      />

      <TransactionFormSheet
        {...sheets.sheetProps("new")}
        categories={categories}
        currency={currency}
        draft={transactions.formDraft}
        defaultListId={filters.listId}
        isEditing={transactions.isEditing}
        onSubmit={transactions.submitForm}
      />

      <DeleteTransactionDialog
        transaction={transactions.pendingDelete}
        currency={currency}
        onCancel={() => transactions.askToDelete(null)}
        onConfirm={(transaction) => {
          transactions.askToDelete(null);
          transactions.remove(transaction);
        }}
      />

      <TransactionDetailSheet
        transaction={detail}
        category={detail ? categoriesById.get(detail.categoryId) : undefined}
        currency={currency}
        onOpenChange={(isOpen) => !isOpen && transactions.showDetail(null)}
        onEdit={(transaction) => {
          transactions.showDetail(null);
          transactions.startEditing(transaction);
        }}
        onDelete={(id) => {
          transactions.showDetail(null);
          if (detail?.id === id) transactions.remove(detail);
        }}
      >
        <TransactionListField transaction={detail} onMessage={toast} />
      </TransactionDetailSheet>

      <BudgetSheet
        category={budgetEditor.category}
        listId={filters.listId}
        currency={currency}
        onClose={budgetEditor.close}
        onSaved={budgetEditor.saved}
        onRemoved={budgetEditor.removed}
      />

      <CategoriesSheet {...sheets.sheetProps("categories")} categories={categories} />

      <SettingsSheet
        {...sheets.sheetProps("settings")}
        currency={currencyCode}
        transactionCount={summary.lifetimeCount}
        onCurrencyChange={setCurrency}
      />

      <NotificationSheet {...sheets.sheetProps("notifications")} />

      <InboxSheet {...sheets.sheetProps("inbox")} currency={currency} categories={categories} />
    </div>
  );
}
