import Foundation

public enum BudgetPeriodUnit: String, Codable, Sendable {
    case week
    case halfMonth = "half_month"
    case month
    case year
}

/// The five supported periods. Mirrors `BUDGET_PERIODS` in `budget/lib/period.ts`.
public enum BudgetPeriod: String, CaseIterable, Codable, Sendable {
    case weekly
    case biweekly
    case monthly
    case quarterly
    case yearly

    public var rule: BudgetRule {
        switch self {
        case .weekly: BudgetRule(unit: .week, count: 1)
        case .biweekly: BudgetRule(unit: .halfMonth, count: 1)
        case .monthly: BudgetRule(unit: .month, count: 1)
        case .quarterly: BudgetRule(unit: .month, count: 3)
        case .yearly: BudgetRule(unit: .year, count: 1)
        }
    }

    public init?(rule: BudgetRule) {
        guard let match = Self.allCases.first(where: { $0.rule == rule }) else { return nil }
        self = match
    }
}

public struct BudgetRule: Hashable, Codable, Sendable {
    public let unit: BudgetPeriodUnit
    public let count: Int

    public init(unit: BudgetPeriodUnit, count: Int) {
        self.unit = unit
        self.count = count
    }

    /// The period that contains `day`: Monday-based weeks, 1st–15th / 16th–end halves, calendar months or
    /// quarters, calendar years.
    public func period(containing day: CalendarDay) -> DayRange {
        switch unit {
        case .week:
            let weekday = Calendar.utcGregorian.component(.weekday, from: day.date) // 1 = Sunday
            let monday = day.addingDays(-((weekday + 5) % 7))
            return DayRange(from: monday, to: monday.addingDays(7 * count))
        case .halfMonth:
            let first = day.startOfMonth
            let sixteenth = CalendarDay(year: day.year, month: day.month, day: 16)!
            return day.day < 16 ? DayRange(from: first, to: sixteenth) : DayRange(from: sixteenth, to: first.adding(months: 1))
        case .month:
            let firstMonth = day.month - ((day.month - 1) % count)
            let start = CalendarDay(year: day.year, month: firstMonth, day: 1)!
            return DayRange(from: start, to: start.adding(months: count))
        case .year:
            let start = CalendarDay(year: day.year, month: 1, day: 1)!
            return DayRange(from: start, to: start.adding(months: 12 * count))
        }
    }

    public func isPeriodStart(_ day: CalendarDay) -> Bool { period(containing: day).from == day }
}

public enum BudgetKind: String, CaseIterable, Codable, Sendable {
    /// Repeats every period.
    case recurring
    /// A single period starting at `startDate`.
    case once
}

public struct BudgetLimit: Hashable, Sendable {
    public let effectiveFrom: CalendarDay
    public let amount: Decimal

    public init(effectiveFrom: CalendarDay, amount: Decimal) {
        self.effectiveFrom = effectiveFrom
        self.amount = amount
    }
}

public struct Budget: Identifiable, Hashable, Sendable {
    public let id: UUID
    public let categoryId: UUID
    public let listId: UUID
    public let kind: BudgetKind
    public let rule: BudgetRule
    public let startDate: CalendarDay
    public var limits: [BudgetLimit]

    public init(id: UUID, categoryId: UUID, listId: UUID, kind: BudgetKind, rule: BudgetRule, startDate: CalendarDay, limits: [BudgetLimit]) {
        self.id = id
        self.categoryId = categoryId
        self.listId = listId
        self.kind = kind
        self.rule = rule
        self.startDate = startDate
        self.limits = limits.sorted { $0.effectiveFrom < $1.effectiveFrom }
    }

    public var period: BudgetPeriod? { BudgetPeriod(rule: rule) }

    /// The period running on `day`, or nil before the start or outside a one-time budget's only period.
    public func activePeriod(on day: CalendarDay) -> DayRange? {
        guard day >= startDate else { return nil }
        let period = rule.period(containing: day)
        if kind == .once, period.from != startDate { return nil }
        return period
    }

    /// The limit in force for the period starting at `start`: the latest one effective on or before it.
    public func limit(at start: CalendarDay) -> Decimal? {
        guard start >= startDate else { return nil }
        return limits.last { $0.effectiveFrom <= start }?.amount
    }

    /// The budget period to show for a home view range: the active one when today is inside the view,
    /// otherwise only a period that matches the view exactly.
    public func period(forView view: DayRange, today: CalendarDay) -> DayRange? {
        guard let from = view.from, view.to != nil else { return nil }
        if view.contains(today) { return activePeriod(on: today) }
        let period = activePeriod(on: from)
        return period == view ? period : nil
    }
}

public enum BudgetAlertKind: String, CaseIterable, Codable, Sendable {
    case percent
    case amount
}

public struct BudgetAlert: Identifiable, Hashable, Sendable {
    public let id: UUID
    public let kind: BudgetAlertKind
    public let value: Decimal

    public init(id: UUID = UUID(), kind: BudgetAlertKind, value: Decimal) {
        self.id = id
        self.kind = kind
        self.value = value
    }

    public func threshold(limit: Decimal) -> Decimal { kind == .percent ? limit * value / 100 : value }

    public func isBelow(limit: Decimal) -> Bool { threshold(limit: limit) < limit }
}

/// Spent vs limit for one period. Mirrors `budgetPreview`, `spentPercent` and `daysLeft`.
public struct BudgetProgress: Hashable, Sendable {
    public let period: DayRange
    public let limit: Decimal
    public let spent: Decimal

    public init(period: DayRange, limit: Decimal, spent: Decimal) {
        self.period = period
        self.limit = limit
        self.spent = spent
    }

    public var ratio: Double {
        guard limit > 0 else { return 0 }
        return min(NSDecimalNumber(decimal: spent / limit).doubleValue, 1)
    }

    public var remaining: Decimal { max(limit - spent, 0) }
    public var excess: Decimal { max(spent - limit, 0) }
    public var isExceeded: Bool { spent > limit }

    public var spentPercent: Int {
        guard limit > 0 else { return 0 }
        return Int((NSDecimalNumber(decimal: spent / limit).doubleValue * 100).rounded())
    }

    public func daysLeft(today: CalendarDay) -> Int {
        guard let to = period.to else { return 0 }
        return Calendar.utcGregorian.dateComponents([.day], from: today.date, to: to.date).day ?? 0
    }
}

public enum BudgetNoticeKind: String, Codable, Sendable {
    case alert = "budget.alert"
    case exceeded = "budget.exceeded"
}

public struct BudgetNotice: Hashable, Sendable {
    public let kind: BudgetNoticeKind
    public let dedupeKey: String
}

/// When to notify about a budget. Mirrors `dueBudgetNotice` in `budget/lib/alerts.ts`:
/// once per period when exceeded; otherwise the highest reached alert above the ones already sent.
public enum BudgetNotices {
    public static let maxAlerts = 5
    public static let defaultAlerts = [BudgetAlert(kind: .percent, value: 80)]

    public static func keyPrefix(budgetId: UUID, periodFrom: CalendarDay) -> String {
        "budget:\(budgetId.uuidString.lowercased()):\(periodFrom.iso):"
    }

    public static func due(
        budgetId: UUID, periodFrom: CalendarDay, spent: Decimal, limit: Decimal, alerts: [BudgetAlert], sentKeys: Set<String>
    ) -> BudgetNotice? {
        let prefix = keyPrefix(budgetId: budgetId, periodFrom: periodFrom)
        let exceededKey = "\(prefix)exceeded"
        if sentKeys.contains(exceededKey) { return nil }
        if spent > limit { return BudgetNotice(kind: .exceeded, dedupeKey: exceededKey) }

        func alertKey(_ alert: BudgetAlert) -> String { "\(prefix)alert:\(alert.id.uuidString.lowercased())" }
        let highestSent = alerts.filter { sentKeys.contains(alertKey($0)) }.map { $0.threshold(limit: limit) }.max()
        let reached = alerts
            .filter { $0.isBelow(limit: limit) && $0.threshold(limit: limit) <= spent }
            .max { $0.threshold(limit: limit) < $1.threshold(limit: limit) }
        guard let reached else { return nil }
        if let highestSent, reached.threshold(limit: limit) <= highestSent { return nil }
        return BudgetNotice(kind: .alert, dedupeKey: alertKey(reached))
    }

    /// Alerts accepted by the API: up to 5, no duplicates, percent an integer 1–99, all below the limit.
    public static func validate(_ alerts: [BudgetAlert], limit: Decimal?) throws {
        guard alerts.count <= maxAlerts else { throw AppError.validation(ErrorCode.alertsInvalid) }
        let keys = Set(alerts.map { "\($0.kind.rawValue):\($0.value)" })
        guard keys.count == alerts.count else { throw AppError.validation(ErrorCode.alertsInvalid) }
        for alert in alerts {
            guard alert.value > 0, alert.value <= Money.maxAmount, Money.hasAtMostTwoDecimals(alert.value) else {
                throw AppError.validation(ErrorCode.alertsInvalid)
            }
            if alert.kind == .percent, !(Money.isWhole(alert.value) && alert.value < 100) {
                throw AppError.validation(ErrorCode.alertsInvalid)
            }
            if let limit, !alert.isBelow(limit: limit) { throw AppError.validation(ErrorCode.alertAboveLimit) }
        }
    }
}

public struct BudgetDraft: Hashable, Sendable {
    public var categoryId: UUID
    public var listId: UUID
    public var kind: BudgetKind
    public var period: BudgetPeriod
    public var startDate: CalendarDay
    public var amount: Decimal

    public init(categoryId: UUID, listId: UUID, kind: BudgetKind, period: BudgetPeriod, startDate: CalendarDay, amount: Decimal) {
        self.categoryId = categoryId
        self.listId = listId
        self.kind = kind
        self.period = period
        self.startDate = startDate
        self.amount = amount
    }

    public func validated() throws -> BudgetDraft {
        guard amount > 0, amount <= Money.maxAmount, Money.hasAtMostTwoDecimals(amount) else {
            throw AppError.validation(ErrorCode.amountInvalid)
        }
        guard period.rule.isPeriodStart(startDate) else { throw AppError.validation(ErrorCode.invalidPeriodStart) }
        return self
    }
}

extension Calendar {
    static let utcGregorian: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        return calendar
    }()
}

extension CalendarDay {
    public func addingDays(_ days: Int) -> CalendarDay {
        CalendarDay(date: Calendar.utcGregorian.date(byAdding: .day, value: days, to: date)!, timeZone: Calendar.utcGregorian.timeZone)
    }
}
