import Foundation
import SwiftData
import ZentletCore

public struct LocalBudgetRepository: BudgetRepository {
    private let store: LocalStore
    private let session: LocalSession
    private let clock: @Sendable () -> Date

    public init(store: LocalStore, session: LocalSession, clock: @escaping @Sendable () -> Date = { .now }) {
        self.store = store
        self.session = session
        self.clock = clock
    }

    public func fetchAll() async throws -> [Budget] {
        let userId = try session.requireUserId()
        return try await store.perform { context in
            let budgets = try context.fetch(FetchDescriptor<BudgetEntity>(
                predicate: #Predicate { $0.userId == userId }, sortBy: [SortDescriptor(\.createdAt)]
            ))
            return try budgets.map { try context.budgetDomain($0) }
        }
    }

    /// Idempotent on `id`. The category must be yours and the list must accept your entries; one budget per
    /// category and list. Starts with the default 80% alert.
    public func create(id: UUID, _ draft: BudgetDraft) async throws -> Budget {
        let userId = try session.requireUserId()
        let draft = try draft.validated()
        let now = clock()
        return try await store.perform { context in
            if let existing = try context.budget(id) {
                guard existing.userId == userId else { throw AppError.conflict(ErrorCode.idTaken) }
                return try context.budgetDomain(existing)
            }
            let categoryId = draft.categoryId
            let ownsCategory = try context.fetchCount(FetchDescriptor<CategoryEntity>(
                predicate: #Predicate { $0.id == categoryId && $0.userId == userId }
            )) > 0
            guard ownsCategory else { throw AppError.validation(ErrorCode.categoryNotFound) }
            guard try context.acceptsEntries(listId: draft.listId, userId: userId) else {
                throw AppError.validation(ErrorCode.listNotFound)
            }
            let listId = draft.listId
            let taken = try context.fetchCount(FetchDescriptor<BudgetEntity>(
                predicate: #Predicate { $0.listId == listId && $0.categoryId == categoryId }
            )) > 0
            guard !taken else { throw AppError.conflict(ErrorCode.categoryHasBudget) }

            let rule = draft.period.rule
            let budget = BudgetEntity(
                id: id, userId: userId, categoryId: categoryId, listId: listId, kind: draft.kind.rawValue,
                periodUnit: rule.unit.rawValue, periodCount: rule.count, startDayKey: draft.startDate.key, createdAt: now
            )
            context.insert(budget)
            context.insert(BudgetLimitEntity(budgetId: id, effectiveFromKey: draft.startDate.key, amount: draft.amount))
            for alert in BudgetNotices.defaultAlerts {
                context.insert(BudgetAlertEntity(id: UUID(), budgetId: id, kind: alert.kind.rawValue, value: alert.value))
            }
            return try context.budgetDomain(budget)
        }
    }

    public func delete(id: UUID) async throws {
        let userId = try session.requireUserId()
        try await store.perform { context in
            try context.deleteBudgetCascade(try context.ownedBudget(id, userId: userId))
        }
    }

    /// `effectiveFrom` must start a period and not precede the budget; a one-time budget only has its start.
    public func setLimit(budgetId: UUID, effectiveFrom: CalendarDay, amount: Decimal) async throws -> Budget {
        let userId = try session.requireUserId()
        guard amount > 0, amount <= Money.maxAmount, Money.hasAtMostTwoDecimals(amount) else {
            throw AppError.validation(ErrorCode.amountInvalid)
        }
        let now = clock()
        return try await store.perform { context in
            let entity = try context.ownedBudget(budgetId, userId: userId)
            let budget = try context.budgetDomain(entity)
            guard budget.rule.isPeriodStart(effectiveFrom) else { throw AppError.validation(ErrorCode.invalidPeriodStart) }
            guard effectiveFrom >= budget.startDate else { throw AppError.validation(ErrorCode.limitBeforeStart) }
            if budget.kind == .once, effectiveFrom != budget.startDate { throw AppError.validation(ErrorCode.singlePeriod) }

            let key = effectiveFrom.key
            if let existing = try context.fetch(FetchDescriptor<BudgetLimitEntity>(
                predicate: #Predicate { $0.budgetId == budgetId && $0.effectiveFromKey == key }
            )).first {
                existing.amount = amount
            } else {
                context.insert(BudgetLimitEntity(budgetId: budgetId, effectiveFromKey: key, amount: amount))
            }
            try context.checkBudgets(userId: userId, categoryId: budget.categoryId, now: now)
            return try context.budgetDomain(entity)
        }
    }

    public func alerts(budgetId: UUID) async throws -> [BudgetAlert] {
        let userId = try session.requireUserId()
        return try await store.perform { context in
            _ = try context.ownedBudget(budgetId, userId: userId)
            return try context.budgetAlerts(budgetId)
        }
    }

    /// Replaces every alert. They must stay below the limit in force today.
    public func replaceAlerts(budgetId: UUID, _ alerts: [BudgetAlert]) async throws -> [BudgetAlert] {
        let userId = try session.requireUserId()
        let now = clock()
        return try await store.perform { context in
            let entity = try context.ownedBudget(budgetId, userId: userId)
            let budget = try context.budgetDomain(entity)
            let today = CalendarDay.today(in: try context.preference(for: userId).domain.timeZone, now: now)
            let limit = budget.activePeriod(on: today).flatMap { budget.limit(at: $0.from! ) } ?? budget.limits.last?.amount
            try BudgetNotices.validate(alerts, limit: limit)

            try context.delete(model: BudgetAlertEntity.self, where: #Predicate { $0.budgetId == budgetId })
            for alert in alerts {
                context.insert(BudgetAlertEntity(id: alert.id, budgetId: budgetId, kind: alert.kind.rawValue, value: alert.value))
            }
            try context.checkBudgets(userId: userId, categoryId: budget.categoryId, now: now)
            return try context.budgetAlerts(budgetId)
        }
    }
}

extension ModelContext {
    func budget(_ id: UUID) throws -> BudgetEntity? {
        try fetch(FetchDescriptor<BudgetEntity>(predicate: #Predicate { $0.id == id })).first
    }

    func ownedBudget(_ id: UUID, userId: UUID) throws -> BudgetEntity {
        guard let budget = try budget(id), budget.userId == userId else { throw AppError.notFound }
        return budget
    }

    func budgetDomain(_ entity: BudgetEntity) throws -> Budget {
        let budgetId = entity.id
        let limits = try fetch(FetchDescriptor<BudgetLimitEntity>(predicate: #Predicate { $0.budgetId == budgetId }))
        return Budget(
            id: entity.id, categoryId: entity.categoryId, listId: entity.listId, kind: BudgetKind(rawValue: entity.kind) ?? .recurring,
            rule: BudgetRule(unit: BudgetPeriodUnit(rawValue: entity.periodUnit) ?? .month, count: entity.periodCount),
            startDate: CalendarDay(key: entity.startDayKey)!,
            limits: limits.compactMap { limit in
                CalendarDay(key: limit.effectiveFromKey).map { BudgetLimit(effectiveFrom: $0, amount: limit.amount) }
            }
        )
    }

    func budgetAlerts(_ budgetId: UUID) throws -> [BudgetAlert] {
        try fetch(FetchDescriptor<BudgetAlertEntity>(predicate: #Predicate { $0.budgetId == budgetId }))
            .map { BudgetAlert(id: $0.id, kind: BudgetAlertKind(rawValue: $0.kind) ?? .percent, value: $0.value) }
            .sorted { $0.value < $1.value }
    }

    func deleteBudgetCascade(_ budget: BudgetEntity) throws {
        let budgetId = budget.id
        try delete(model: BudgetLimitEntity.self, where: #Predicate { $0.budgetId == budgetId })
        try delete(model: BudgetAlertEntity.self, where: #Predicate { $0.budgetId == budgetId })
        delete(budget)
    }

    /// Owner or editor of the list (any currency rule is checked when entries are added).
    func acceptsEntries(listId: UUID, userId: UUID) throws -> Bool {
        guard let member = try membership(listId: listId, userId: userId), let role = ListRole(rawValue: member.role) else { return false }
        return ListPolicy.canContribute(role)
    }

    /// After an expense changes: notify for every budget of that category whose current period crossed an alert.
    /// Mirrors `CheckBudgetUseCase`; "spent" counts only the budget owner's own expenses in the list.
    func checkBudgets(userId: UUID, categoryId: UUID, now: Date) throws {
        let preference = try preference(for: userId).domain
        let today = CalendarDay.today(in: preference.timeZone, now: now)
        let budgets = try fetch(FetchDescriptor<BudgetEntity>(predicate: #Predicate { $0.userId == userId && $0.categoryId == categoryId }))
        guard !budgets.isEmpty else { return }
        let categoryName = try fetch(FetchDescriptor<CategoryEntity>(predicate: #Predicate { $0.id == categoryId })).first?.name ?? ""

        for entity in budgets {
            let budget = try budgetDomain(entity)
            guard let period = budget.activePeriod(on: today), let from = period.from, let to = period.to,
                  let limit = budget.limit(at: from) else { continue }

            let listId = entity.listId
            let fromKey = from.key
            let toKey = to.key
            let expense = TransactionType.expense.rawValue
            let spent = try fetch(FetchDescriptor<TransactionEntity>(predicate: #Predicate {
                $0.userId == userId && $0.categoryId == categoryId && $0.listId == listId && $0.type == expense
                    && $0.dayKey >= fromKey && $0.dayKey < toKey
            })).reduce(Decimal(0)) { $0 + $1.amount }

            let prefix = BudgetNotices.keyPrefix(budgetId: entity.id, periodFrom: from)
            let sent = Set(try fetch(FetchDescriptor<NotificationEntity>(predicate: #Predicate { $0.userId == userId }))
                .map(\.dedupeKey).filter { $0.hasPrefix(prefix) })
            guard let notice = BudgetNotices.due(
                budgetId: entity.id, periodFrom: from, spent: spent, limit: limit, alerts: try budgetAlerts(entity.id), sentKeys: sent
            ) else { continue }

            let data = BudgetNoticeData(
                budgetId: entity.id, categoryName: categoryName, currency: preference.currency, spent: spent, limit: limit, periodFrom: from
            )
            try notify(
                userId: userId, content: notice.kind == .exceeded ? .budgetExceeded(data) : .budgetAlert(data),
                dedupeKey: notice.dedupeKey, now: now
            )
        }
    }

    /// Stores a notice once per `dedupeKey`.
    func notify(userId: UUID, content: NotificationContent, dedupeKey: String, now: Date) throws {
        let exists = try fetchCount(FetchDescriptor<NotificationEntity>(
            predicate: #Predicate { $0.userId == userId && $0.dedupeKey == dedupeKey }
        )) > 0
        guard !exists else { return }
        let payload = NotificationPayload(content)
        insert(NotificationEntity(
            id: UUID(), userId: userId, type: payload.type, payload: try JSONEncoder().encode(payload), dedupeKey: dedupeKey, createdAt: now
        ))
    }
}

/// Storage shape of a notification, same fields as the web `NotificationPayloads`.
struct NotificationPayload: Codable {
    var type: String
    var budget: BudgetNoticeData?
    var listId: UUID?
    var listName: String?
    var memberName: String?

    init(_ content: NotificationContent) {
        switch content {
        case .budgetAlert(let data): type = "budget.alert"; budget = data
        case .budgetExceeded(let data): type = "budget.exceeded"; budget = data
        case .listJoined(let listId, let listName, let memberName):
            type = "list.joined"; self.listId = listId; self.listName = listName; self.memberName = memberName
        case .listOwned(let listId, let listName):
            type = "list.owned"; self.listId = listId; self.listName = listName
        }
    }

    var content: NotificationContent? {
        switch type {
        case "budget.alert": budget.map(NotificationContent.budgetAlert)
        case "budget.exceeded": budget.map(NotificationContent.budgetExceeded)
        case "list.joined":
            listId.map { .listJoined(listId: $0, listName: listName ?? "", memberName: memberName ?? "") }
        case "list.owned": listId.map { .listOwned(listId: $0, listName: listName ?? "") }
        default: nil
        }
    }
}
