import Foundation
import SwiftData
import ZentletCore

/// Shared lookups used by several local repositories, so each invariant (private list, membership, preference)
/// is implemented once.
extension ModelContext {
    func user(_ id: UUID) throws -> UserEntity? {
        try fetch(FetchDescriptor<UserEntity>(predicate: #Predicate { $0.id == id })).first
    }

    func preference(for userId: UUID) throws -> PreferenceEntity {
        if let existing = try fetch(FetchDescriptor<PreferenceEntity>(predicate: #Predicate { $0.userId == userId })).first {
            return existing
        }
        let defaults = UserPreference()
        let created = PreferenceEntity(
            userId: userId, language: defaults.language.rawValue, currency: defaults.currency.rawValue, timezone: defaults.timezone
        )
        insert(created)
        return created
    }

    func accountCurrency(of userId: UUID) throws -> Currency {
        Currency(rawValue: try preference(for: userId).currency) ?? .default
    }

    /// Returns the user's private list, creating it (and its owner membership) on first use.
    func ensurePrivateList(for userId: UUID, now: Date) throws -> ListEntity {
        let owner: UUID? = userId
        if let existing = try fetch(FetchDescriptor<ListEntity>(predicate: #Predicate { $0.privateOwnerId == owner })).first {
            return existing
        }
        let list = ListEntity(
            id: UUID(), name: TransactionList.privateName, icon: TransactionList.privateIcon,
            color: TransactionList.privateColor, details: nil, currency: try preference(for: userId).currency,
            ownerId: userId, privateOwnerId: userId, createdAt: now
        )
        insert(list)
        insert(MemberEntity(listId: list.id, userId: userId, role: ListRole.owner.rawValue, joinedAt: now))
        return list
    }

    func list(_ id: UUID) throws -> ListEntity? {
        try fetch(FetchDescriptor<ListEntity>(predicate: #Predicate { $0.id == id })).first
    }

    func membership(listId: UUID, userId: UUID) throws -> MemberEntity? {
        try fetch(FetchDescriptor<MemberEntity>(predicate: #Predicate { $0.listId == listId && $0.userId == userId })).first
    }

    func members(of listId: UUID) throws -> [MemberEntity] {
        try fetch(FetchDescriptor<MemberEntity>(predicate: #Predicate { $0.listId == listId }, sortBy: [SortDescriptor(\.joinedAt)]))
    }

    /// The list and the caller's role, or `not_found` when the caller isn't a member (no existence leak).
    func listForMember(_ listId: UUID, userId: UUID) throws -> (ListEntity, ListRole) {
        guard let list = try list(listId), let member = try membership(listId: listId, userId: userId),
              let role = ListRole(rawValue: member.role) else { throw AppError.notFound }
        return (list, role)
    }

    func transactions(inList listId: UUID) throws -> [TransactionEntity] {
        try fetch(FetchDescriptor<TransactionEntity>(predicate: #Predicate { $0.listId == listId }))
    }

    /// Moves a user's transactions in `listId` back to their private list.
    func returnTransactionsToPrivateList(userId: UUID, from listId: UUID, now: Date) throws {
        let privateList = try ensurePrivateList(for: userId, now: now)
        let moving = try fetch(FetchDescriptor<TransactionEntity>(predicate: #Predicate { $0.listId == listId && $0.userId == userId }))
        for transaction in moving {
            transaction.listId = privateList.id
            transaction.updatedAt = now
        }
    }

    /// Deletes a list with its transactions, memberships and invites.
    func deleteListCascade(_ list: ListEntity) throws {
        let listId = list.id
        try delete(model: TransactionEntity.self, where: #Predicate { $0.listId == listId })
        try delete(model: MemberEntity.self, where: #Predicate { $0.listId == listId })
        try delete(model: InviteEntity.self, where: #Predicate { $0.listId == listId })
        for budget in try fetch(FetchDescriptor<BudgetEntity>(predicate: #Predicate { $0.listId == listId })) {
            try deleteBudgetCascade(budget)
        }
        delete(list)
    }
}

// MARK: - Mapping to domain

extension UserEntity {
    var domain: User { User(id: id, name: name, email: email, onboardingCompletedAt: onboardingCompletedAt, createdAt: createdAt) }
}

extension PreferenceEntity {
    var domain: UserPreference {
        UserPreference(
            language: AppLanguage(rawValue: language) ?? .es, currency: Currency(rawValue: currency) ?? .default, timezone: timezone
        )
    }
}

extension CategoryEntity {
    var domain: ZentletCore.Category {
        ZentletCore.Category(id: id, name: name, icon: icon, color: color, description: details, createdAt: createdAt)
    }
}

extension TransactionEntity {
    var domain: Transaction {
        Transaction(
            id: id, type: TransactionType(rawValue: type) ?? .expense, amount: amount, description: details,
            reference: reference, categoryId: categoryId, transactionDate: CalendarDay(key: dayKey)!, listId: listId,
            userId: userId, recurringTransactionId: recurringTransactionId
        )
    }
}

extension ListEntity {
    var domain: TransactionList {
        TransactionList(
            id: id, name: name, icon: icon, color: color, description: details, currency: Currency(rawValue: currency) ?? .default,
            isPrivate: privateOwnerId != nil
        )
    }
}

extension InviteEntity {
    func domain(token: String? = nil) -> ListInvite {
        ListInvite(
            id: id, listId: listId, role: InviteRole(rawValue: role) ?? .viewer, email: email, expiresAt: expiresAt,
            createdAt: createdAt, acceptedAt: acceptedAt, revokedAt: revokedAt, token: token
        )
    }
}

/// Opaque offset cursor for local pagination.
enum LocalCursor {
    static func offset(from cursor: String?) throws -> Int {
        guard let cursor else { return 0 }
        guard let offset = Int(cursor), offset >= 0 else { throw AppError.validation("invalid_cursor") }
        return offset
    }

    static func page<T>(_ items: [T], offset: Int, limit: Int) -> (items: [T], next: String?) {
        let slice = Array(items.dropFirst(offset).prefix(limit))
        let next = offset + slice.count < items.count ? String(offset + slice.count) : nil
        return (slice, next)
    }
}

extension Array where Element == TransactionEntity {
    /// Newest first: date, then creation, then id (same order as the web feed).
    func sortedForFeed() -> [TransactionEntity] {
        sorted {
            if $0.dayKey != $1.dayKey { return $0.dayKey > $1.dayKey }
            if $0.createdAt != $1.createdAt { return $0.createdAt > $1.createdAt }
            return $0.id.uuidString > $1.id.uuidString
        }
    }
}
