import Foundation
import Observation

/// Measures budget progress for the current period, as the web `useBudgetBars` does: one summary per distinct
/// period range, then each budget reads its category's own expense from it.
enum BudgetMeasurer {
    static func progress(
        budgets: [Budget], view: DayRange?, today: CalendarDay, transactions: TransactionRepository
    ) async throws -> [UUID: BudgetProgress] {
        var measurements: [(budget: Budget, period: DayRange, limit: Decimal)] = []
        for budget in budgets {
            let period = view.map { budget.period(forView: $0, today: today) } ?? budget.activePeriod(on: today)
            guard let period, let from = period.from, let limit = budget.limit(at: from) else { continue }
            measurements.append((budget, period, limit))
        }

        var summaries: [String: TransactionSummary] = [:]
        for measurement in measurements {
            let key = "\(measurement.budget.listId)|\(measurement.period.from?.iso ?? "")"
            if summaries[key] == nil {
                summaries[key] = try await transactions.summary(range: measurement.period, listId: measurement.budget.listId)
            }
        }

        var result: [UUID: BudgetProgress] = [:]
        for measurement in measurements {
            let key = "\(measurement.budget.listId)|\(measurement.period.from?.iso ?? "")"
            let spent = summaries[key]?.byCategory[measurement.budget.categoryId]?.expense ?? 0
            result[measurement.budget.id] = BudgetProgress(period: measurement.period, limit: measurement.limit, spent: spent)
        }
        return result
    }
}

@MainActor
@Observable
public final class BudgetsViewModel {
    public private(set) var budgets: [Budget] = []
    public private(set) var progress: [UUID: BudgetProgress] = [:]
    public private(set) var categories: [UUID: Category] = [:]
    public private(set) var lists: [UUID: TransactionList] = [:]
    public private(set) var isLoading = false
    public var errorMessage: String?

    private let dependencies: AppDependencies
    private let today: () -> CalendarDay

    public init(dependencies: AppDependencies, today: @escaping () -> CalendarDay) {
        self.dependencies = dependencies
        self.today = today
    }

    public var todayDay: CalendarDay { today() }

    public func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            budgets = try await dependencies.budgets.fetchAll()
            categories = Dictionary(uniqueKeysWithValues: try await dependencies.categories.fetchAll().map { ($0.id, $0) })
            lists = Dictionary(uniqueKeysWithValues: try await dependencies.lists.fetchMemberships().map { ($0.list.id, $0.list) })
            progress = try await BudgetMeasurer.progress(budgets: budgets, view: nil, today: today(), transactions: dependencies.transactions)
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }

    public func delete(_ budget: Budget) async {
        do {
            try await dependencies.budgets.delete(id: budget.id)
            budgets.removeAll { $0.id == budget.id }
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }
}

@MainActor
@Observable
public final class BudgetFormViewModel {
    public var categoryId: UUID?
    public var listId: UUID?
    public var kind: BudgetKind = .recurring
    public var period: BudgetPeriod = .monthly
    public var amountText = "" {
        didSet {
            let cleaned = Money.cleanInput(amountText)
            if cleaned != amountText { amountText = cleaned }
        }
    }

    public private(set) var categories: [Category] = []
    /// Lists where the user may keep a budget (owner or editor).
    public private(set) var lists: [TransactionList] = []
    public private(set) var isSaving = false
    public var errorMessage: String?

    private let dependencies: AppDependencies
    private let today: CalendarDay

    public init(dependencies: AppDependencies, today: CalendarDay, categoryId: UUID? = nil, listId: UUID? = nil) {
        self.dependencies = dependencies
        self.today = today
        self.categoryId = categoryId
        self.listId = listId
    }

    /// Budgets start at the beginning of the current period.
    public var startDate: CalendarDay { period.rule.period(containing: today).from ?? today }
    public var amount: Decimal { Money.parse(amountText) }
    public var canSave: Bool { categoryId != nil && listId != nil && amount > 0 && !isSaving }

    public func load() async {
        do {
            categories = try await dependencies.categories.fetchAll()
            lists = try await dependencies.lists.fetchMemberships().filter { ListPolicy.canContribute($0.role) }.map(\.list)
            if categoryId == nil { categoryId = categories.first?.id }
            if listId == nil { listId = lists.first { $0.isPrivate }?.id ?? lists.first?.id }
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }

    public func save() async -> Budget? {
        guard let categoryId, let listId else { return nil }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        let draft = BudgetDraft(categoryId: categoryId, listId: listId, kind: kind, period: period, startDate: startDate, amount: amount)
        do {
            return try await dependencies.budgets.create(id: UUID(), draft)
        } catch {
            errorMessage = UserMessage.from(error)
            return nil
        }
    }
}

/// One budget: progress, limit changes from now or next period, and alerts.
@MainActor
@Observable
public final class BudgetDetailViewModel {
    public enum LimitScope: String, CaseIterable, Sendable {
        case currentPeriod
        case nextPeriod
    }

    public private(set) var budget: Budget
    public private(set) var progress: BudgetProgress?
    public private(set) var alerts: [BudgetAlert] = []
    public var limitText = "" {
        didSet {
            let cleaned = Money.cleanInput(limitText)
            if cleaned != limitText { limitText = cleaned }
        }
    }
    public var limitScope: LimitScope = .currentPeriod
    public var errorMessage: String?

    private let dependencies: AppDependencies
    private let today: CalendarDay

    public init(budget: Budget, dependencies: AppDependencies, today: CalendarDay) {
        self.budget = budget
        self.dependencies = dependencies
        self.today = today
    }

    public var currentPeriod: DayRange? { budget.activePeriod(on: today) }
    public var currentLimit: Decimal? { currentPeriod?.from.flatMap { budget.limit(at: $0) } ?? budget.limits.last?.amount }
    public var canChooseScope: Bool { budget.kind == .recurring }
    public var todayDay: CalendarDay { today }

    public func load() async {
        do {
            alerts = try await dependencies.budgets.alerts(budgetId: budget.id)
            progress = try await BudgetMeasurer.progress(budgets: [budget], view: nil, today: today, transactions: dependencies.transactions)[budget.id]
            limitText = currentLimit.map { "\($0)" } ?? ""
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }

    public func saveLimit() async {
        let period = currentPeriod ?? budget.rule.period(containing: today)
        guard var effectiveFrom = period.from else { return }
        if limitScope == .nextPeriod, budget.kind == .recurring, let to = period.to { effectiveFrom = to }
        if effectiveFrom < budget.startDate { effectiveFrom = budget.startDate }
        do {
            budget = try await dependencies.budgets.setLimit(budgetId: budget.id, effectiveFrom: effectiveFrom, amount: Money.parse(limitText))
            await load()
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }

    public func addAlert(kind: BudgetAlertKind, value: Decimal) async {
        await replaceAlerts(alerts + [BudgetAlert(kind: kind, value: value)])
    }

    public func removeAlert(_ alert: BudgetAlert) async {
        await replaceAlerts(alerts.filter { $0.id != alert.id })
    }

    /// Returns true when deleted.
    public func delete() async -> Bool {
        do {
            try await dependencies.budgets.delete(id: budget.id)
            return true
        } catch {
            errorMessage = UserMessage.from(error)
            return false
        }
    }

    private func replaceAlerts(_ updated: [BudgetAlert]) async {
        do {
            try BudgetNotices.validate(updated, limit: currentLimit)
            alerts = try await dependencies.budgets.replaceAlerts(budgetId: budget.id, updated)
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }
}
