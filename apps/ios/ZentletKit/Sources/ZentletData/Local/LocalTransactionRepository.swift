import Foundation
import SwiftData
import ZentletCore

public struct LocalTransactionRepository: TransactionRepository {
    private let store: LocalStore
    private let session: LocalSession
    private let clock: @Sendable () -> Date

    public init(store: LocalStore, session: LocalSession, clock: @escaping @Sendable () -> Date = { .now }) {
        self.store = store
        self.session = session
        self.clock = clock
    }

    public func fetch(_ query: TransactionQuery) async throws -> TransactionPage {
        let userId = try session.requireUserId()
        guard TransactionQuery.limitRange.contains(query.limit) else { throw AppError.validation("invalid_limit") }
        let offset = try LocalCursor.offset(from: query.cursor)
        let search = query.search?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            .prefix(TransactionQuery.maxSearchLength)

        return try await store.perform { context in
            var matches = try Self.own(userId: userId, range: query.range, listId: query.listId, context: context)
            if let type = query.type?.rawValue { matches = matches.filter { $0.type == type } }
            if let categoryId = query.categoryId { matches = matches.filter { $0.categoryId == categoryId } }
            if let search, !search.isEmpty {
                let names = try Self.categoryNames(userId: userId, context: context)
                matches = matches.filter {
                    ($0.details?.lowercased().contains(search) ?? false) || (names[$0.categoryId]?.contains(search) ?? false)
                }
            }
            let page = LocalCursor.page(matches.sortedForFeed(), offset: offset, limit: query.limit)
            return TransactionPage(items: page.items.map(\.domain), nextCursor: page.next)
        }
    }

    public func fetch(id: UUID) async throws -> Transaction? {
        let userId = try session.requireUserId()
        return try await store.perform { try Self.authored(id, by: userId, context: $0)?.domain }
    }

    /// Idempotent on `id`. The transaction lands in `listId` only if the author may contribute there and the
    /// currency matches; otherwise it goes to the private list without failing. With `recurrence` it starts a
    /// series (always in the private list) whose next occurrence follows the later of its date and today.
    public func create(id: UUID, _ draft: TransactionDraft, listId: UUID?, recurrence: RecurrenceFrequency?) async throws -> Transaction {
        let listId = recurrence == nil ? listId : nil
        let userId = try session.requireUserId()
        let draft = try draft.validated()
        let now = clock()
        return try await store.perform { context in
            if let existing = try Self.find(id, context: context) {
                guard existing.userId == userId else { throw AppError.conflict(ErrorCode.idTaken) }
                return existing.domain
            }
            try Self.requireOwnCategory(draft.categoryId, userId: userId, context: context)

            let privateList = try context.ensurePrivateList(for: userId, now: now)
            var requested: (TransactionList, ListRole)?
            if let listId, let list = try context.list(listId), let member = try context.membership(listId: listId, userId: userId) {
                requested = (list.domain, ListRole(rawValue: member.role) ?? .viewer)
            }
            let target = ListPolicy.targetListId(
                requested: requested?.0, role: requested?.1, privateListId: privateList.id,
                accountCurrency: try context.accountCurrency(of: userId)
            )

            var seriesId: UUID?
            if let recurrence {
                let today = CalendarDay.today(in: try context.preference(for: userId).domain.timeZone, now: now)
                let series = RecurringEntity(
                    id: UUID(), userId: userId, categoryId: draft.categoryId, type: draft.type.rawValue, amount: draft.amount,
                    details: draft.description, frequency: recurrence.rawValue, anchorDayKey: draft.transactionDate.key,
                    nextDueDayKey: RecurrenceSchedule.firstDueDate(anchor: draft.transactionDate, frequency: recurrence, today: today).key,
                    createdAt: now
                )
                context.insert(series)
                seriesId = series.id
            }

            let transaction = TransactionEntity(
                id: id, userId: userId, listId: target, categoryId: draft.categoryId, type: draft.type.rawValue,
                amount: draft.amount, details: draft.description, reference: draft.reference,
                dayKey: draft.transactionDate.key, createdAt: now, recurringTransactionId: seriesId
            )
            context.insert(transaction)
            if draft.type == .expense { try context.checkBudgets(userId: userId, categoryId: draft.categoryId, now: now) }
            return transaction.domain
        }
    }

    public func update(id: UUID, _ draft: TransactionDraft) async throws -> Transaction {
        let userId = try session.requireUserId()
        let draft = try draft.validated()
        let now = clock()
        return try await store.perform { context in
            guard let transaction = try Self.authored(id, by: userId, context: context) else { throw AppError.notFound }
            try Self.requireOwnCategory(draft.categoryId, userId: userId, context: context)
            transaction.type = draft.type.rawValue
            transaction.amount = draft.amount
            transaction.categoryId = draft.categoryId
            transaction.dayKey = draft.transactionDate.key
            transaction.details = draft.description
            transaction.reference = draft.reference
            transaction.updatedAt = now
            if draft.type == .expense { try context.checkBudgets(userId: userId, categoryId: draft.categoryId, now: now) }
            return transaction.domain
        }
    }

    public func delete(id: UUID) async throws {
        let userId = try session.requireUserId()
        try await store.perform { context in
            guard let transaction = try Self.authored(id, by: userId, context: context) else { throw AppError.notFound }
            context.delete(transaction)
        }
    }

    public func summary(range: DayRange, listId: UUID?) async throws -> TransactionSummary {
        let userId = try session.requireUserId()
        return try await store.perform { context in
            Calculations.summary(of: try Self.own(userId: userId, range: range, listId: listId, context: context).map(\.domain))
        }
    }

    // MARK: - Helpers

    private static func own(userId: UUID, range: DayRange, listId: UUID?, context: ModelContext) throws -> [TransactionEntity] {
        let from = range.from?.key ?? Int.min
        let to = range.to?.key ?? Int.max
        let predicate: Predicate<TransactionEntity>
        if let listId {
            predicate = #Predicate { $0.userId == userId && $0.listId == listId && $0.dayKey >= from && $0.dayKey < to }
        } else {
            predicate = #Predicate { $0.userId == userId && $0.dayKey >= from && $0.dayKey < to }
        }
        return try context.fetch(FetchDescriptor(predicate: predicate))
    }

    private static func find(_ id: UUID, context: ModelContext) throws -> TransactionEntity? {
        try context.fetch(FetchDescriptor<TransactionEntity>(predicate: #Predicate { $0.id == id })).first
    }

    /// Only the author can read, edit or delete a transaction, even inside shared lists.
    private static func authored(_ id: UUID, by userId: UUID, context: ModelContext) throws -> TransactionEntity? {
        try context.fetch(FetchDescriptor<TransactionEntity>(predicate: #Predicate { $0.id == id && $0.userId == userId })).first
    }

    private static func requireOwnCategory(_ categoryId: UUID, userId: UUID, context: ModelContext) throws {
        let count = try context.fetchCount(FetchDescriptor<CategoryEntity>(
            predicate: #Predicate { $0.id == categoryId && $0.userId == userId }
        ))
        guard count > 0 else { throw AppError.validation(ErrorCode.categoryNotFound) }
    }

    private static func categoryNames(userId: UUID, context: ModelContext) throws -> [UUID: String] {
        let categories = try context.fetch(FetchDescriptor<CategoryEntity>(predicate: #Predicate { $0.userId == userId }))
        return Dictionary(uniqueKeysWithValues: categories.map { ($0.id, $0.name.lowercased()) })
    }
}
