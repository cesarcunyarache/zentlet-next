import SwiftUI
import ZentletCore

struct BudgetsView: View {
    var body: some View {
        WithDependencies { dependencies in
            BudgetsScreen(model: BudgetsViewModel(
                dependencies: dependencies, today: { CalendarDay.today(in: .current, now: dependencies.clock()) }
            ))
        }
    }
}

private struct BudgetsScreen: View {
    @State private var model: BudgetsViewModel
    @State private var isCreating = false
    @State private var selected: Budget?

    init(model: BudgetsViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        List {
            ForEach(model.budgets) { budget in
                Button { selected = budget } label: {
                    BudgetRow(
                        budget: budget, category: model.categories[budget.categoryId], list: model.lists[budget.listId],
                        progress: model.progress[budget.id], today: model.todayDay
                    )
                }
                .buttonStyle(.plain)
                .swipeActions {
                    Button("Delete", systemImage: "trash", role: .destructive) { Task { await model.delete(budget) } }
                }
            }
        }
        .overlay {
            if model.budgets.isEmpty, !model.isLoading {
                ContentUnavailableView {
                    Label("No budgets", systemImage: "gauge.with.dots.needle.33percent")
                } description: {
                    Text("Set a spending cap per category, weekly, monthly or for the period you want.")
                } actions: {
                    Button("Create budget") { isCreating = true }
                }
            }
        }
        .navigationTitle("Budgets")
        .toolbar { Button("New budget", systemImage: "plus") { isCreating = true } }
        .task { await model.load() }
        .refreshable { await model.load() }
        .sheet(isPresented: $isCreating, onDismiss: reload) { BudgetFormView(categoryId: nil, listId: nil) }
        .sheet(item: $selected, onDismiss: reload) { BudgetDetailView(budget: $0) }
        .errorAlert($model.errorMessage)
    }

    private func reload() {
        Task { await model.load() }
    }
}

struct BudgetRow: View {
    let budget: Budget
    let category: ZentletCore.Category?
    let list: TransactionList?
    let progress: BudgetProgress?
    let today: CalendarDay

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.md) {
                IconBadge(icon: category?.icon ?? ZentletCore.Category.fallbackIcon, color: category?.color ?? "")
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(category?.name ?? String(localized: "Category"))
                    Text("\(BudgetLabels.period(budget)) · \(list?.name ?? "")")
                        .font(Typography.caption)
                        .foregroundStyle(Palette.muted)
                }
                Spacer()
                if let progress {
                    Text("\(progress.spentPercent)%")
                        .font(Typography.amount)
                        .foregroundStyle(progress.isExceeded ? Palette.destructive : Palette.foreground)
                }
            }
            if let progress {
                BudgetBar(progress: progress)
                HStack {
                    Text(BudgetLabels.status(progress, currency: list?.currency ?? .default))
                    Spacer()
                    Text("\(progress.daysLeft(today: today)) days left")
                }
                .font(Typography.caption)
                .foregroundStyle(Palette.muted)
            } else {
                Text("Not active in this period.")
                    .font(Typography.caption)
                    .foregroundStyle(Palette.muted)
            }
        }
        .padding(.vertical, Spacing.xs)
        .accessibilityElement(children: .combine)
    }
}

struct BudgetBar: View {
    let progress: BudgetProgress

    var body: some View {
        ProgressView(value: progress.ratio)
            .tint(progress.isExceeded ? Palette.destructive : Palette.foreground)
            .accessibilityLabel("Budget used")
            .accessibilityValue("\(progress.spentPercent)%")
    }
}

enum BudgetLabels {
    static func period(_ period: BudgetPeriod) -> String {
        switch period {
        case .weekly: String(localized: "Weekly")
        case .biweekly: String(localized: "Biweekly")
        case .monthly: String(localized: "Monthly")
        case .quarterly: String(localized: "Quarterly")
        case .yearly: String(localized: "Yearly")
        }
    }

    static func period(_ budget: Budget) -> String {
        let name = budget.period.map(period) ?? ""
        return budget.kind == .once ? String(localized: "\(name), once") : name
    }

    static func status(_ progress: BudgetProgress, currency: Currency) -> String {
        progress.isExceeded
            ? String(localized: "\(Money.format(progress.excess, currency: currency)) over")
            : String(localized: "\(Money.format(progress.remaining, currency: currency)) left")
    }
}

struct BudgetFormView: View {
    let categoryId: UUID?
    let listId: UUID?

    var body: some View {
        WithDependencies { dependencies in
            BudgetFormScreen(model: BudgetFormViewModel(
                dependencies: dependencies, today: CalendarDay.today(in: .current, now: dependencies.clock()),
                categoryId: categoryId, listId: listId
            ))
        }
    }
}

private struct BudgetFormScreen: View {
    @Environment(\.dismiss) private var dismiss
    @State private var model: BudgetFormViewModel

    init(model: BudgetFormViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Category", selection: $model.categoryId) {
                        ForEach(model.categories) { Text("\($0.icon) \($0.name)").tag(UUID?.some($0.id)) }
                    }
                    Picker("List", selection: $model.listId) {
                        ForEach(model.lists) { Text("\($0.icon) \($0.name)").tag(UUID?.some($0.id)) }
                    }
                }
                Section {
                    Picker("Period", selection: $model.period) {
                        ForEach(BudgetPeriod.allCases, id: \.self) { Text(BudgetLabels.period($0)).tag($0) }
                    }
                    Picker("Repeats", selection: $model.kind) {
                        Text("Every period").tag(BudgetKind.recurring)
                        Text("Only this period").tag(BudgetKind.once)
                    }
                    LabeledContent("Starts", value: model.startDate.relativeTitle(today: CalendarDay.today(in: .current)))
                } footer: {
                    Text("Weeks start on Monday; biweekly periods are the 1st–15th and the 16th–end of month.")
                }
                Section("Limit") {
                    TextField("0.00", text: $model.amountText)
                        .keyboardType(.decimalPad)
                        .font(Typography.amount)
                }
            }
            .navigationTitle("New budget")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { if await model.save() != nil { dismiss() } } }
                        .disabled(!model.canSave)
                }
            }
            .task { await model.load() }
            .errorAlert($model.errorMessage)
        }
    }
}

struct BudgetDetailView: View {
    let budget: Budget

    var body: some View {
        WithDependencies { dependencies in
            BudgetDetailScreen(model: BudgetDetailViewModel(
                budget: budget, dependencies: dependencies, today: CalendarDay.today(in: .current, now: dependencies.clock())
            ))
        }
    }
}

private struct BudgetDetailScreen: View {
    @Environment(\.dismiss) private var dismiss
    @State private var model: BudgetDetailViewModel
    @State private var newAlertKind: BudgetAlertKind = .percent
    @State private var newAlertText = ""
    @State private var confirmDelete = false

    init(model: BudgetDetailViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        NavigationStack {
            Form {
                if let progress = model.progress {
                    Section {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text(CalendarDay.rangeTitle(progress.period))
                                .font(Typography.caption)
                                .foregroundStyle(Palette.muted)
                            Text("\(progress.spentPercent)%").font(Typography.amountHero)
                            BudgetBar(progress: progress)
                            Text("\(progress.daysLeft(today: model.todayDay)) days left")
                                .font(Typography.caption)
                                .foregroundStyle(Palette.muted)
                        }
                    }
                }

                Section {
                    TextField("0.00", text: $model.limitText)
                        .keyboardType(.decimalPad)
                        .font(Typography.amount)
                    if model.canChooseScope {
                        Picker("Applies", selection: $model.limitScope) {
                            Text("From this period").tag(BudgetDetailViewModel.LimitScope.currentPeriod)
                            Text("From next period").tag(BudgetDetailViewModel.LimitScope.nextPeriod)
                        }
                    }
                    Button("Save limit") { Task { await model.saveLimit() } }
                        .disabled(Money.parse(model.limitText) <= 0)
                } header: {
                    Text("Limit")
                } footer: {
                    Text("Earlier periods keep the limit they had.")
                }

                Section {
                    ForEach(model.alerts) { alert in
                        Text(alert.kind == .percent ? "At \(NSDecimalNumber(decimal: alert.value).intValue)%" : "At \(Money.formatNumber(alert.value))")
                            .swipeActions {
                                Button("Delete", role: .destructive) { Task { await model.removeAlert(alert) } }
                            }
                    }
                    if model.alerts.count < BudgetNotices.maxAlerts {
                        HStack {
                            Picker("Kind", selection: $newAlertKind) {
                                Text("%").tag(BudgetAlertKind.percent)
                                Text("Amount").tag(BudgetAlertKind.amount)
                            }
                            .pickerStyle(.segmented)
                            .frame(maxWidth: 140)
                            TextField(newAlertKind == .percent ? "80" : "0.00", text: $newAlertText)
                                .keyboardType(.decimalPad)
                            Button("Add") {
                                let value = Money.parse(Money.cleanInput(newAlertText))
                                newAlertText = ""
                                Task { await model.addAlert(kind: newAlertKind, value: value) }
                            }
                            .disabled(Money.parse(Money.cleanInput(newAlertText)) <= 0)
                        }
                    }
                } header: {
                    Text("Alerts")
                } footer: {
                    Text("You get a notice when spending reaches an alert, and when it goes over the limit.")
                }

                Section { Button("Delete budget", role: .destructive) { confirmDelete = true } }
            }
            .navigationTitle("Budget")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .task { await model.load() }
            .confirmationDialog("Delete this budget?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete", role: .destructive) { Task { if await model.delete() { dismiss() } } }
            }
            .errorAlert($model.errorMessage)
        }
    }
}
