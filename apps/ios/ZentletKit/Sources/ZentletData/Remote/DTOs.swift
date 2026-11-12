import Foundation
import ZentletCore

/// Wire shapes of the existing web REST API (`apps/web/src/app/api/**`), field for field.
/// Mappers to domain live next to each DTO so the remote repositories stay thin.

struct UserDTO: Decodable {
    let id: UUID
    let name: String
    let email: String
    let createdAt: Date
    let onboardingCompletedAt: Date?

    var domain: User { User(id: id, name: name, email: email, onboardingCompletedAt: onboardingCompletedAt, createdAt: createdAt) }
}

struct SessionDTO: Decodable {
    let user: UserDTO
}

struct AuthResponseDTO: Decodable {
    let token: String?
    let user: UserDTO
}

struct PreferenceDTO: Codable {
    let language: AppLanguage
    let currency: Currency
    let timezone: String

    init(_ preference: UserPreference) {
        language = preference.language
        currency = preference.currency
        timezone = preference.timezone
    }

    var domain: UserPreference { UserPreference(language: language, currency: currency, timezone: timezone) }
}

struct CategoryDTO: Decodable {
    let id: UUID
    let name: String
    let icon: String
    let color: String
    let description: String?
    let createdAt: Date

    var domain: ZentletCore.Category {
        ZentletCore.Category(id: id, name: name, icon: icon, color: color, description: description, createdAt: createdAt)
    }
}

struct CategoryBodyDTO: Encodable {
    var id: UUID?
    let name: String
    let icon: String
    let color: String
    let description: String?

    init(id: UUID?, _ draft: CategoryDraft) {
        self.id = id
        name = draft.name
        icon = draft.icon
        color = draft.color
        description = draft.description
    }
}

struct TransactionDTO: Decodable {
    let id: UUID
    let description: String
    let amount: Decimal
    let type: TransactionType
    let categoryId: UUID
    let transactionDate: CalendarDay
    let reference: String?
    let listId: UUID?
    let recurringTransactionId: UUID?

    /// The feed only returns the caller's own transactions, so the author is the caller.
    func domain(author: UUID, fallbackListId: UUID?) -> Transaction {
        Transaction(
            id: id, type: type, amount: Money.rounded(amount), description: description.isEmpty ? nil : description,
            reference: reference, categoryId: categoryId, transactionDate: transactionDate,
            listId: listId ?? fallbackListId ?? UUID(), userId: author, recurringTransactionId: recurringTransactionId
        )
    }
}

struct TransactionBodyDTO: Encodable {
    var id: UUID?
    let description: String
    let amount: Decimal
    let type: TransactionType
    let categoryId: UUID
    let transactionDate: CalendarDay
    let reference: String?
    var listId: UUID?
    var recurrence: RecurrenceFrequency?

    init(id: UUID?, _ draft: TransactionDraft, listId: UUID?, recurrence: RecurrenceFrequency? = nil) {
        self.recurrence = recurrence
        self.id = id
        description = draft.description ?? ""
        amount = draft.amount
        type = draft.type
        categoryId = draft.categoryId
        transactionDate = draft.transactionDate
        reference = draft.reference
        self.listId = listId
    }
}

struct PageDTO<Item: Decodable>: Decodable {
    let items: [Item]
    let nextCursor: String?
}

struct TypeTotalsDTO: Decodable {
    let expense: Decimal
    let income: Decimal

    var domain: TypeTotals { TypeTotals(expense: Money.rounded(expense), income: Money.rounded(income)) }
}

struct SummaryDTO: Decodable {
    let count: Int
    let expenseTotal: Decimal
    let incomeTotal: Decimal
    let byCategory: [String: TypeTotalsDTO]

    var domain: TransactionSummary {
        TransactionSummary(
            count: count, totals: TypeTotals(expense: Money.rounded(expenseTotal), income: Money.rounded(incomeTotal)),
            byCategory: Dictionary(uniqueKeysWithValues: byCategory.compactMap { key, value in
                UUID(uuidString: key).map { ($0, value.domain) }
            })
        )
    }
}

struct ListDTO: Decodable {
    let id: UUID
    let name: String
    let icon: String
    let color: String
    let description: String?
    let currency: Currency
    let role: ListRole
    let memberCount: Int
    let isPrivate: Bool
    let expenseTotal: Decimal
    let incomeTotal: Decimal

    var list: TransactionList {
        TransactionList(id: id, name: name, icon: icon, color: color, description: description, currency: currency, isPrivate: isPrivate)
    }

    var membership: ListMembership {
        ListMembership(
            list: list, role: role, memberCount: memberCount,
            totals: TypeTotals(expense: Money.rounded(expenseTotal), income: Money.rounded(incomeTotal))
        )
    }
}

struct ListDetailDTO: Decodable {
    struct CategoryTotalsDTO: Decodable {
        let id: UUID
        let expense: Decimal
        let income: Decimal
    }

    struct MemberDTO: Decodable {
        let userId: UUID
        let name: String
        let role: ListRole
        let expense: Decimal
        let income: Decimal
        let count: Int
    }

    let summary: ListDTO
    let byCategory: [CategoryTotalsDTO]
    let members: [MemberDTO]

    init(from decoder: Decoder) throws {
        summary = try ListDTO(from: decoder)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        byCategory = try container.decode([CategoryTotalsDTO].self, forKey: .byCategory)
        members = try container.decode([MemberDTO].self, forKey: .members)
    }

    private enum CodingKeys: String, CodingKey { case byCategory, members }

    /// The API sends neither email nor join date for members; they are left empty here.
    var domain: ListDetail {
        ListDetail(
            membership: summary.membership,
            members: members.map {
                ListMember(userId: $0.userId, name: $0.name, email: "", role: $0.role, joinedAt: .distantPast)
            },
            breakdown: ListBreakdown(
                totals: summary.membership.totals,
                byCategory: Dictionary(uniqueKeysWithValues: byCategory.map { ($0.id, TypeTotals(expense: Money.rounded($0.expense), income: Money.rounded($0.income))) }),
                byMember: Dictionary(uniqueKeysWithValues: members.map {
                    ($0.userId, MemberTotals(totals: TypeTotals(expense: Money.rounded($0.expense), income: Money.rounded($0.income)), count: $0.count))
                })
            )
        )
    }
}

struct ListBodyDTO: Encodable {
    var id: UUID?
    let name: String
    let icon: String
    let color: String
    let description: String?

    init(id: UUID?, _ draft: ListDraft) {
        self.id = id
        name = draft.name
        icon = draft.icon
        color = draft.color
        description = draft.description
    }
}

struct ListEntryDTO: Decodable {
    let id: UUID
    let description: String
    let amount: Decimal
    let type: TransactionType
    let categoryId: UUID
    let transactionDate: CalendarDay
    let authorId: UUID

    func domain(listId: UUID) -> Transaction {
        Transaction(
            id: id, type: type, amount: Money.rounded(amount), description: description.isEmpty ? nil : description,
            reference: nil, categoryId: categoryId, transactionDate: transactionDate, listId: listId, userId: authorId
        )
    }
}

struct InviteDTO: Decodable {
    let id: UUID
    let role: InviteRole
    let email: String?
    let expiresAt: Date
    let createdAt: Date
    let token: String?

    func domain(listId: UUID) -> ListInvite {
        ListInvite(
            id: id, listId: listId, role: role, email: email, expiresAt: expiresAt, createdAt: createdAt,
            acceptedAt: nil, revokedAt: nil, token: token
        )
    }
}

struct InvitePreviewDTO: Decodable {
    let name: String
    let icon: String
    let currency: Currency
    let ownerName: String
    let role: InviteRole
    let isMember: Bool

    var domain: InvitePreview {
        InvitePreview(listName: name, listIcon: icon, ownerName: ownerName, role: role, currency: currency, alreadyMember: isMember)
    }
}

struct AcceptInviteDTO: Decodable {
    let joined: Bool
}

struct RoleBodyDTO: Encodable {
    let role: InviteRole
}

struct AssignBodyDTO: Encodable {
    let transactionIds: [UUID]
}

struct BudgetDTO: Decodable {
    struct LimitDTO: Decodable {
        let effectiveFrom: CalendarDay
        let amount: Decimal
    }

    let id: UUID
    let categoryId: UUID
    let listId: UUID
    let kind: BudgetKind
    let periodUnit: BudgetPeriodUnit
    let periodCount: Int
    let startDate: CalendarDay
    let limits: [LimitDTO]

    var domain: Budget {
        Budget(
            id: id, categoryId: categoryId, listId: listId, kind: kind, rule: BudgetRule(unit: periodUnit, count: periodCount),
            startDate: startDate, limits: limits.map { BudgetLimit(effectiveFrom: $0.effectiveFrom, amount: Money.rounded($0.amount)) }
        )
    }
}

struct BudgetBodyDTO: Encodable {
    let id: UUID
    let categoryId: UUID
    let listId: UUID
    let kind: BudgetKind
    let periodUnit: BudgetPeriodUnit
    let periodCount: Int
    let startDate: CalendarDay
    let amount: Decimal

    init(id: UUID, _ draft: BudgetDraft) {
        self.id = id
        categoryId = draft.categoryId
        listId = draft.listId
        kind = draft.kind
        periodUnit = draft.period.rule.unit
        periodCount = draft.period.rule.count
        startDate = draft.startDate
        amount = draft.amount
    }
}

struct AmountBodyDTO: Encodable {
    let amount: Decimal
}

struct BudgetAlertDTO: Codable {
    var id: UUID?
    let kind: BudgetAlertKind
    let value: Decimal

    var domain: BudgetAlert { BudgetAlert(id: id ?? UUID(), kind: kind, value: Money.rounded(value)) }
}

struct AlertsBodyDTO: Encodable {
    let alerts: [BudgetAlertDTO]
}

struct RecurringDTO: Decodable {
    let id: UUID
    let frequency: RecurrenceFrequency
    let nextDueDate: CalendarDay

    var domain: RecurringTransaction { RecurringTransaction(id: id, frequency: frequency, nextDueDate: nextDueDate) }
}

/// `{ id, type, data, readAt, createdAt }` where `data` depends on `type` (see `notification/types`).
struct NotificationDTO: Decodable {
    struct BudgetData: Decodable {
        let budgetId: UUID
        let categoryName: String
        let currency: Currency
        let spent: Decimal
        let limit: Decimal
        let periodFrom: CalendarDay
    }

    struct ListData: Decodable {
        let listId: UUID
        let listName: String
        let memberName: String?
    }

    let id: UUID
    let readAt: Date?
    let createdAt: Date
    let content: NotificationContent?

    private enum CodingKeys: String, CodingKey { case id, type, data, readAt, createdAt }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        readAt = try container.decodeIfPresent(Date.self, forKey: .readAt)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        switch try container.decode(String.self, forKey: .type) {
        case "budget.alert", "budget.exceeded":
            let type = try container.decode(String.self, forKey: .type)
            let data = try container.decode(BudgetData.self, forKey: .data)
            let notice = BudgetNoticeData(
                budgetId: data.budgetId, categoryName: data.categoryName, currency: data.currency,
                spent: Money.rounded(data.spent), limit: Money.rounded(data.limit), periodFrom: data.periodFrom
            )
            content = type == "budget.alert" ? .budgetAlert(notice) : .budgetExceeded(notice)
        case "list.joined":
            let data = try container.decode(ListData.self, forKey: .data)
            content = .listJoined(listId: data.listId, listName: data.listName, memberName: data.memberName ?? "")
        case "list.owned":
            let data = try container.decode(ListData.self, forKey: .data)
            content = .listOwned(listId: data.listId, listName: data.listName)
        default:
            content = nil
        }
    }
}

struct NotificationFeedDTO: Decodable {
    let items: [NotificationDTO]
    let unreadCount: Int

    var domain: NotificationFeed {
        NotificationFeed(
            items: items.compactMap { item in
                item.content.map { AppNotification(id: item.id, content: $0, readAt: item.readAt, createdAt: item.createdAt) }
            },
            unreadCount: unreadCount
        )
    }
}
