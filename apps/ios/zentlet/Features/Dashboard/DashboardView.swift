import SwiftUI
import ZentletCore

struct DashboardView: View {
    var body: some View {
        WithDependencies { dependencies in
            DashboardScreen(model: DashboardViewModel(
                transactions: dependencies.transactions, categories: dependencies.categories, lists: dependencies.lists,
                budgets: dependencies.budgets, today: { CalendarDay.today(in: .current, now: dependencies.clock()) }
            ))
        }
    }
}

private struct DashboardScreen: View {
    @Environment(SessionViewModel.self) private var session
    @State private var model: DashboardViewModel
    @State private var isAddingTransaction = false
    @State private var editing: Transaction?
    @State private var budgetCategory: ZentletCore.Category?

    init(model: DashboardViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        List {
            Section {
                headline
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: Spacing.lg, leading: Spacing.lg, bottom: Spacing.sm, trailing: Spacing.lg))
            }

            if !model.strip.isEmpty {
                Section {
                    categoryStrip
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                }
            }

            Section {
                if model.recent.isEmpty, !model.isLoading {
                    emptyState
                } else {
                    ForEach(model.recent) { transaction in
                        Button { editing = transaction } label: {
                            TransactionRow(transaction: transaction, category: category(of: transaction), currency: model.currency)
                        }
                        .buttonStyle(.plain)
                    }
                }
            } header: {
                SectionHeader(title: "Recent")
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(model.selectedList?.name ?? String(localized: "Home"))
        .toolbar {
            ToolbarItem(placement: .topBarLeading) { listMenu }
            ToolbarItem(placement: .topBarTrailing) { NotificationBell() }
            ToolbarItem(placement: .topBarTrailing) {
                Button("Add movement", systemImage: "plus") { isAddingTransaction = true }
            }
        }
        .refreshable { await model.load() }
        .task { await model.load() }
        .onChange(of: model.period) { Task { try? await model.refresh() } }
        .onChange(of: model.type) { Task { try? await model.refresh() } }
        .onChange(of: model.listId) { Task { try? await model.refresh() } }
        .sheet(isPresented: $isAddingTransaction, onDismiss: reload) {
            TransactionFormView(editing: nil, defaultListId: model.listId)
        }
        .sheet(item: $editing, onDismiss: reload) { transaction in
            TransactionFormView(editing: transaction, defaultListId: nil)
        }
        .sheet(item: $budgetCategory, onDismiss: reload) { category in
            BudgetFormView(categoryId: category.id, listId: model.listId)
        }
        .errorAlert($model.errorMessage)
    }

    private var headline: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Picker("Period", selection: $model.period) {
                Text("This month").tag(SummaryPeriod.month)
                Text("Last month").tag(SummaryPeriod.previous)
                Text("All time").tag(SummaryPeriod.all)
            }
            .pickerStyle(.segmented)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(headlineLabel)
                    .font(.subheadline)
                    .foregroundStyle(Palette.muted)
                Text(Money.formatSigned(model.headline.value, currency: model.currency))
                    .font(Typography.amountHero)
                    .foregroundStyle(model.headline.tone == .income ? Palette.income : Palette.foreground)
                    .contentTransition(.numericText())
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
            }
            .accessibilityElement(children: .combine)

            Picker("Type", selection: $model.type) {
                Text("All").tag(TransactionType?.none)
                Text("Expenses").tag(TransactionType?.some(.expense))
                Text("Income").tag(TransactionType?.some(.income))
            }
            .pickerStyle(.segmented)
        }
    }

    private var headlineLabel: String {
        if let id = model.categoryId, let category = model.categories.first(where: { $0.id == id }) { return category.name }
        switch model.type {
        case .expense: return String(localized: "Expenses")
        case .income: return String(localized: "Income")
        case nil: return String(localized: "Balance")
        }
    }

    private var categoryStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.sm) {
                ForEach(model.strip) { item in
                    Button {
                        Task { await model.select(categoryId: item.category.id) }
                    } label: {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            HStack(spacing: Spacing.xs) {
                                Text(item.category.icon)
                                Text(item.category.name).lineLimit(1)
                            }
                            .font(.footnote)
                            Text(Money.formatShort(item.value))
                                .font(Typography.amount)
                            if let ratio = item.budgetRatio {
                                ProgressView(value: ratio)
                                    .tint(ratio >= 1 ? Palette.destructive : Palette.foreground)
                                Text("of \(Money.formatShort(item.budget ?? 0))")
                                    .font(Typography.caption)
                                    .foregroundStyle(Palette.muted)
                            }
                        }
                        .padding(Spacing.md)
                        .frame(minWidth: 96, alignment: .leading)
                        .background(Palette.surface, in: RoundedRectangle(cornerRadius: Radius.lg))
                        .overlay {
                            RoundedRectangle(cornerRadius: Radius.lg)
                                .stroke(model.categoryId == item.category.id ? Palette.foreground : .clear, lineWidth: 1.5)
                        }
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        if item.budget == nil {
                            Button("Create budget", systemImage: "gauge.with.dots.needle.33percent") { budgetCategory = item.category }
                        }
                    }
                    .accessibilityLabel("\(item.category.name), \(Money.format(item.value, currency: model.currency))")
                }
            }
            .padding(.horizontal, Spacing.lg)
        }
    }

    private var listMenu: some View {
        Menu {
            Picker("List", selection: $model.listId) {
                ForEach(model.lists) { membership in
                    Text("\(membership.list.icon) \(membership.list.name)").tag(UUID?.some(membership.list.id))
                }
            }
        } label: {
            Label("List", systemImage: "line.3.horizontal.decrease.circle")
        }
    }

    @ViewBuilder
    private var emptyState: some View {
        if model.allTimeCount == 0 {
            ContentUnavailableView {
                Label("No movements yet", systemImage: "tray")
            } description: {
                Text(model.categories.isEmpty ? "Create a category in Settings, then add your first movement." : "Add your first movement.")
            } actions: {
                Button("Add movement") { isAddingTransaction = true }
                    .disabled(model.categories.isEmpty)
            }
        } else {
            Text("Nothing in this period.")
                .foregroundStyle(Palette.muted)
        }
    }

    private func category(of transaction: Transaction) -> ZentletCore.Category? {
        model.categories.first { $0.id == transaction.categoryId }
    }

    private func reload() {
        Task { await model.load() }
    }
}
