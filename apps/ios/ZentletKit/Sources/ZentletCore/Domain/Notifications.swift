import Foundation

/// In-app notices. Same four types as the web (`notification/types`).
public enum NotificationContent: Hashable, Sendable {
    case budgetAlert(BudgetNoticeData)
    case budgetExceeded(BudgetNoticeData)
    case listJoined(listId: UUID, listName: String, memberName: String)
    case listOwned(listId: UUID, listName: String)

    public var title: String {
        switch self {
        case .budgetAlert(let data): String(localized: "\(data.categoryName) budget at \(data.percent)%")
        case .budgetExceeded(let data): String(localized: "\(data.categoryName) budget exceeded")
        case .listJoined(_, let listName, _): String(localized: "New member in \(listName)")
        case .listOwned(_, let listName): String(localized: "You now own \(listName)")
        }
    }

    public var body: String {
        switch self {
        case .budgetAlert(let data), .budgetExceeded(let data):
            String(localized: "Spent \(Money.format(data.spent, currency: data.currency)) of \(Money.format(data.limit, currency: data.currency)).")
        case .listJoined(_, _, let memberName): String(localized: "\(memberName) joined the list.")
        case .listOwned: String(localized: "The previous owner deleted their account.")
        }
    }
}

public struct BudgetNoticeData: Hashable, Codable, Sendable {
    public let budgetId: UUID
    public let categoryName: String
    public let currency: Currency
    public let spent: Decimal
    public let limit: Decimal
    public let periodFrom: CalendarDay

    public init(budgetId: UUID, categoryName: String, currency: Currency, spent: Decimal, limit: Decimal, periodFrom: CalendarDay) {
        self.budgetId = budgetId
        self.categoryName = categoryName
        self.currency = currency
        self.spent = spent
        self.limit = limit
        self.periodFrom = periodFrom
    }

    public var percent: Int { BudgetProgress(period: .allTime, limit: limit, spent: spent).spentPercent }
}

public struct AppNotification: Identifiable, Hashable, Sendable {
    public let id: UUID
    public let content: NotificationContent
    public let readAt: Date?
    public let createdAt: Date

    public init(id: UUID, content: NotificationContent, readAt: Date?, createdAt: Date) {
        self.id = id
        self.content = content
        self.readAt = readAt
        self.createdAt = createdAt
    }

    public var isUnread: Bool { readAt == nil }
}

public struct NotificationFeed: Sendable {
    public let items: [AppNotification]
    public let unreadCount: Int

    public init(items: [AppNotification], unreadCount: Int) {
        self.items = items
        self.unreadCount = unreadCount
    }
}
