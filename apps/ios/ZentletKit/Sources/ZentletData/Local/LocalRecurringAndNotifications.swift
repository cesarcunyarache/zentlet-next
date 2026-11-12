import Foundation
import SwiftData
import ZentletCore

public struct LocalRecurringRepository: RecurringRepository {
    private let store: LocalStore
    private let session: LocalSession
    private let clock: @Sendable () -> Date

    public init(store: LocalStore, session: LocalSession, clock: @escaping @Sendable () -> Date = { .now }) {
        self.store = store
        self.session = session
        self.clock = clock
    }

    public func fetch(id: UUID) async throws -> RecurringTransaction {
        let userId = try session.requireUserId()
        return try await store.perform { context in
            guard let series = try context.recurring(id), series.userId == userId else { throw AppError.notFound }
            return RecurringTransaction(
                id: series.id, frequency: RecurrenceFrequency(rawValue: series.frequency) ?? .monthly,
                nextDueDate: CalendarDay(key: series.nextDueDayKey)!
            )
        }
    }

    /// Deletes the series; past movements stay and lose the link.
    public func stop(id: UUID) async throws {
        let userId = try session.requireUserId()
        let now = clock()
        try await store.perform { context in
            guard let series = try context.recurring(id), series.userId == userId else { throw AppError.notFound }
            let seriesId: UUID? = id
            for transaction in try context.fetch(FetchDescriptor<TransactionEntity>(predicate: #Predicate { $0.recurringTransactionId == seriesId })) {
                transaction.recurringTransactionId = nil
                transaction.updatedAt = now
            }
            context.delete(series)
        }
    }

    /// The local stand-in for the web cron: creates each due occurrence in the private list, once per date.
    public func materializeDue() async throws {
        guard let userId = try session.currentUserId() else { return }
        let now = clock()
        try await store.perform { context in
            let today = CalendarDay.today(in: try context.preference(for: userId).domain.timeZone, now: now)
            let todayKey = today.key
            let due = try context.fetch(FetchDescriptor<RecurringEntity>(
                predicate: #Predicate { $0.userId == userId && $0.nextDueDayKey <= todayKey }
            ))
            guard !due.isEmpty else { return }
            let privateListId = try context.ensurePrivateList(for: userId, now: now).id

            for series in due {
                let frequency = RecurrenceFrequency(rawValue: series.frequency) ?? .monthly
                let schedule = RecurrenceSchedule.dueDates(
                    anchor: CalendarDay(key: series.anchorDayKey)!, frequency: frequency,
                    nextDueDate: CalendarDay(key: series.nextDueDayKey)!, through: today
                )
                for day in schedule.dates {
                    let seriesId: UUID? = series.id
                    let dayKey = day.key
                    let exists = try context.fetchCount(FetchDescriptor<TransactionEntity>(
                        predicate: #Predicate { $0.recurringTransactionId == seriesId && $0.dayKey == dayKey }
                    )) > 0
                    if exists { continue }
                    context.insert(TransactionEntity(
                        id: UUID(), userId: userId, listId: privateListId, categoryId: series.categoryId, type: series.type,
                        amount: series.amount, details: series.details, reference: nil, dayKey: dayKey, createdAt: now,
                        recurringTransactionId: series.id
                    ))
                }
                series.nextDueDayKey = schedule.nextDueDate.key
                if series.type == TransactionType.expense.rawValue, !schedule.dates.isEmpty {
                    try context.checkBudgets(userId: userId, categoryId: series.categoryId, now: now)
                }
            }
        }
    }
}

extension ModelContext {
    func recurring(_ id: UUID) throws -> RecurringEntity? {
        try fetch(FetchDescriptor<RecurringEntity>(predicate: #Predicate { $0.id == id })).first
    }
}

public struct LocalNotificationRepository: NotificationRepository {
    private let store: LocalStore
    private let session: LocalSession
    private let clock: @Sendable () -> Date
    private static let feedLimit = 50

    public init(store: LocalStore, session: LocalSession, clock: @escaping @Sendable () -> Date = { .now }) {
        self.store = store
        self.session = session
        self.clock = clock
    }

    public func feed() async throws -> NotificationFeed {
        let userId = try session.requireUserId()
        return try await store.perform { context in
            var descriptor = FetchDescriptor<NotificationEntity>(
                predicate: #Predicate { $0.userId == userId }, sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
            )
            descriptor.fetchLimit = Self.feedLimit
            let items = try context.fetch(descriptor).compactMap { entity -> AppNotification? in
                guard let content = try? JSONDecoder().decode(NotificationPayload.self, from: entity.payload).content else { return nil }
                return AppNotification(id: entity.id, content: content, readAt: entity.readAt, createdAt: entity.createdAt)
            }
            let unread = try context.fetchCount(FetchDescriptor<NotificationEntity>(
                predicate: #Predicate { $0.userId == userId && $0.readAt == nil }
            ))
            return NotificationFeed(items: items, unreadCount: unread)
        }
    }

    public func markAllRead() async throws {
        let userId = try session.requireUserId()
        let now = clock()
        try await store.perform { context in
            for entity in try context.fetch(FetchDescriptor<NotificationEntity>(predicate: #Predicate { $0.userId == userId && $0.readAt == nil })) {
                entity.readAt = now
            }
        }
    }
}
