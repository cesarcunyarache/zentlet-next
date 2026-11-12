import SwiftUI
import ZentletCore

struct TransactionRow: View {
    let transaction: Transaction
    let category: ZentletCore.Category?
    let currency: Currency

    var body: some View {
        HStack(spacing: Spacing.md) {
            IconBadge(icon: category?.icon ?? ZentletCore.Category.fallbackIcon, color: category?.color ?? "")
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                HStack(spacing: Spacing.xs) {
                    Text(transaction.description ?? category?.name ?? String(localized: "Movement"))
                        .lineLimit(1)
                    if transaction.recurringTransactionId != nil {
                        Image(systemName: "repeat")
                            .font(.caption2)
                            .foregroundStyle(Palette.muted)
                            .accessibilityLabel("Repeats")
                    }
                }
                if transaction.description != nil, let name = category?.name {
                    Text(name)
                        .font(Typography.caption)
                        .foregroundStyle(Palette.muted)
                }
            }
            Spacer(minLength: Spacing.sm)
            AmountText(value: transaction.signedAmount, currency: currency)
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}

struct TransactionsView: View {
    var body: some View {
        WithDependencies { dependencies in
            TransactionsScreen(model: TransactionsViewModel(transactions: dependencies.transactions, categories: dependencies.categories))
        }
    }
}

private struct TransactionsScreen: View {
    @Environment(SessionViewModel.self) private var session
    @State private var model: TransactionsViewModel
    @State private var isAdding = false
    @State private var editing: Transaction?
    @State private var searchTask: Task<Void, Never>?

    init(model: TransactionsViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        List {
            if model.transactions.isEmpty, !model.isLoading {
                ContentUnavailableView.search(text: model.search)
            }
            ForEach(model.groups) { group in
                Section {
                    ForEach(group.transactions) { transaction in
                        Button { editing = transaction } label: {
                            TransactionRow(transaction: transaction, category: model.categories[transaction.categoryId], currency: session.preference.currency)
                        }
                        .buttonStyle(.plain)
                        .swipeActions {
                            Button("Delete", systemImage: "trash", role: .destructive) {
                                Task { await model.delete(transaction) }
                            }
                        }
                    }
                } header: {
                    HStack {
                        Text(group.day.relativeTitle(today: CalendarDay.today(in: session.preference.timeZone)))
                        Spacer()
                        Text(Money.formatSigned(group.total, currency: session.preference.currency))
                            .monospacedDigit()
                    }
                }
            }
            if model.hasMore {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .task { await model.loadMore() }
            }
        }
        .navigationTitle("Movements")
        .searchable(text: $model.search, prompt: "Search description or category")
        .onChange(of: model.search) { debounceSearch() }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) { filterMenu }
            ToolbarItem(placement: .topBarTrailing) {
                Button("Add movement", systemImage: "plus") { isAdding = true }
            }
        }
        .task { await model.reload() }
        .refreshable { await model.reload() }
        .sheet(isPresented: $isAdding, onDismiss: reload) { TransactionFormView(editing: nil, defaultListId: nil) }
        .sheet(item: $editing, onDismiss: reload) { TransactionFormView(editing: $0, defaultListId: nil) }
        .errorAlert($model.errorMessage)
    }

    private var filterMenu: some View {
        Menu {
            Picker("Type", selection: $model.type) {
                Text("All").tag(TransactionType?.none)
                Text("Expenses").tag(TransactionType?.some(.expense))
                Text("Income").tag(TransactionType?.some(.income))
            }
            Picker("Category", selection: $model.categoryId) {
                Text("All categories").tag(UUID?.none)
                ForEach(model.categories.values.sorted { $0.name < $1.name }) { category in
                    Text("\(category.icon) \(category.name)").tag(UUID?.some(category.id))
                }
            }
        } label: {
            Label("Filter", systemImage: "line.3.horizontal.decrease.circle")
        }
        .onChange(of: model.type) { reload() }
        .onChange(of: model.categoryId) { reload() }
    }

    /// Waits for typing to pause; a new keystroke cancels the previous search.
    private func debounceSearch() {
        searchTask?.cancel()
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            await model.reload()
        }
    }

    private func reload() {
        Task { await model.reload() }
    }
}
