import Foundation

public struct User: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var name: String
    public var email: String
    public var onboardingCompletedAt: Date?
    public let createdAt: Date

    public init(id: UUID, name: String, email: String, onboardingCompletedAt: Date? = nil, createdAt: Date) {
        self.id = id
        self.name = name
        self.email = email
        self.onboardingCompletedAt = onboardingCompletedAt
        self.createdAt = createdAt
    }
}

public enum AppLanguage: String, CaseIterable, Codable, Sendable {
    case es
    case en
}

public struct UserPreference: Hashable, Sendable {
    public var language: AppLanguage
    public var currency: Currency
    public var timezone: String

    public init(language: AppLanguage = .es, currency: Currency = .default, timezone: String = "America/Lima") {
        self.language = language
        self.currency = currency
        self.timezone = timezone
    }

    public var timeZone: TimeZone { TimeZone(identifier: timezone) ?? .current }
}

public struct Category: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var name: String
    public var icon: String
    public var color: String
    public var description: String?
    public let createdAt: Date

    public init(id: UUID, name: String, icon: String, color: String, description: String?, createdAt: Date) {
        self.id = id
        self.name = name
        self.icon = icon
        self.color = color
        self.description = description
        self.createdAt = createdAt
    }

    public static let fallbackIcon = "📦"
}

public enum TransactionType: String, CaseIterable, Codable, Sendable {
    case expense
    case income
}

public struct Transaction: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var type: TransactionType
    public var amount: Decimal
    public var description: String?
    public var reference: String?
    public var categoryId: UUID
    public var transactionDate: CalendarDay
    public let listId: UUID
    /// The author. Only the author can edit or delete it.
    public let userId: UUID
    /// Set when the movement was created by a recurring series.
    public let recurringTransactionId: UUID?

    public init(
        id: UUID, type: TransactionType, amount: Decimal, description: String?, reference: String?,
        categoryId: UUID, transactionDate: CalendarDay, listId: UUID, userId: UUID, recurringTransactionId: UUID? = nil
    ) {
        self.id = id
        self.type = type
        self.amount = amount
        self.description = description
        self.reference = reference
        self.categoryId = categoryId
        self.transactionDate = transactionDate
        self.listId = listId
        self.userId = userId
        self.recurringTransactionId = recurringTransactionId
    }

    /// Positive for income, negative for expense.
    public var signedAmount: Decimal { type == .income ? amount : -amount }
}

public enum ListRole: String, CaseIterable, Codable, Sendable {
    case owner
    case editor
    case viewer
}

public struct TransactionList: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var name: String
    public var icon: String
    public var color: String
    public var description: String?
    public let currency: Currency
    public let isPrivate: Bool

    public init(
        id: UUID, name: String, icon: String, color: String, description: String?, currency: Currency,
        isPrivate: Bool
    ) {
        self.id = id
        self.name = name
        self.icon = icon
        self.color = color
        self.description = description
        self.currency = currency
        self.isPrivate = isPrivate
    }

    public static let privateName = "Lista privada"
    public static let privateIcon = "🔒"
    public static let privateColor = "#E2E8F0"
}

public struct TypeTotals: Hashable, Sendable {
    public var expense: Decimal
    public var income: Decimal

    public init(expense: Decimal = 0, income: Decimal = 0) {
        self.expense = expense
        self.income = income
    }

    public var balance: Decimal { income - expense }

    public mutating func add(_ type: TransactionType, _ amount: Decimal) {
        switch type {
        case .expense: expense += amount
        case .income: income += amount
        }
    }
}

/// One row of "my lists": the list, my role in it and its totals.
public struct ListMembership: Identifiable, Hashable, Sendable {
    public let list: TransactionList
    public let role: ListRole
    public let memberCount: Int
    public let totals: TypeTotals

    public init(list: TransactionList, role: ListRole, memberCount: Int, totals: TypeTotals) {
        self.list = list
        self.role = role
        self.memberCount = memberCount
        self.totals = totals
    }

    public var id: UUID { list.id }
}

public struct ListMember: Identifiable, Hashable, Sendable {
    public let userId: UUID
    public let name: String
    public let email: String
    public let role: ListRole
    public let joinedAt: Date

    public init(userId: UUID, name: String, email: String, role: ListRole, joinedAt: Date) {
        self.userId = userId
        self.name = name
        self.email = email
        self.role = role
        self.joinedAt = joinedAt
    }

    public var id: UUID { userId }
}

public struct MemberTotals: Hashable, Sendable {
    public var totals: TypeTotals
    public var count: Int

    public init(totals: TypeTotals = TypeTotals(), count: Int = 0) {
        self.totals = totals
        self.count = count
    }
}

/// Totals of a list over every member's transactions: overall, per category and per member.
/// This per-member breakdown is the only "between participants" figure the product has; there are no debts.
public struct ListBreakdown: Hashable, Sendable {
    public var totals: TypeTotals
    public var byCategory: [UUID: TypeTotals]
    public var byMember: [UUID: MemberTotals]

    public init(totals: TypeTotals = TypeTotals(), byCategory: [UUID: TypeTotals] = [:], byMember: [UUID: MemberTotals] = [:]) {
        self.totals = totals
        self.byCategory = byCategory
        self.byMember = byMember
    }
}

public struct ListDetail: Hashable, Sendable {
    public let membership: ListMembership
    public let members: [ListMember]
    public let breakdown: ListBreakdown

    public init(membership: ListMembership, members: [ListMember], breakdown: ListBreakdown) {
        self.membership = membership
        self.members = members
        self.breakdown = breakdown
    }
}

public enum InviteRole: String, CaseIterable, Codable, Sendable {
    case editor
    case viewer

    public var listRole: ListRole { self == .editor ? .editor : .viewer }
}

public struct ListInvite: Identifiable, Hashable, Sendable {
    public let id: UUID
    public let listId: UUID
    public let role: InviteRole
    public let email: String?
    public let expiresAt: Date
    public let createdAt: Date
    public let acceptedAt: Date?
    public let revokedAt: Date?
    /// Only present right after creation: the secret is stored hashed and can't be recovered later.
    public let token: String?

    public init(
        id: UUID, listId: UUID, role: InviteRole, email: String?, expiresAt: Date, createdAt: Date,
        acceptedAt: Date?, revokedAt: Date?, token: String?
    ) {
        self.id = id
        self.listId = listId
        self.role = role
        self.email = email
        self.expiresAt = expiresAt
        self.createdAt = createdAt
        self.acceptedAt = acceptedAt
        self.revokedAt = revokedAt
        self.token = token
    }
}

public struct InvitePreview: Hashable, Sendable {
    public let listName: String
    public let listIcon: String
    public let ownerName: String
    public let role: InviteRole
    public let currency: Currency
    public let alreadyMember: Bool

    public init(listName: String, listIcon: String, ownerName: String, role: InviteRole, currency: Currency, alreadyMember: Bool) {
        self.listName = listName
        self.listIcon = listIcon
        self.ownerName = ownerName
        self.role = role
        self.currency = currency
        self.alreadyMember = alreadyMember
    }
}

public struct TransactionSummary: Hashable, Sendable {
    public var count: Int
    public var totals: TypeTotals
    public var byCategory: [UUID: TypeTotals]

    public init(count: Int = 0, totals: TypeTotals = TypeTotals(), byCategory: [UUID: TypeTotals] = [:]) {
        self.count = count
        self.totals = totals
        self.byCategory = byCategory
    }
}

public struct TransactionPage: Sendable {
    public let items: [Transaction]
    public let nextCursor: String?

    public init(items: [Transaction], nextCursor: String?) {
        self.items = items
        self.nextCursor = nextCursor
    }
}
