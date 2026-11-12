import Foundation
import SwiftData
import ZentletCore

public struct LocalCategoryRepository: CategoryRepository {
    private let store: LocalStore
    private let session: LocalSession
    private let clock: @Sendable () -> Date

    public init(store: LocalStore, session: LocalSession, clock: @escaping @Sendable () -> Date = { .now }) {
        self.store = store
        self.session = session
        self.clock = clock
    }

    public func fetchAll() async throws -> [ZentletCore.Category] {
        let userId = try session.requireUserId()
        return try await store.perform { context in
            let descriptor = FetchDescriptor<CategoryEntity>(
                predicate: #Predicate { $0.userId == userId }, sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
            )
            return try context.fetch(descriptor).map(\.domain)
        }
    }

    /// Idempotent on `id`: retrying returns the same category; an id owned by someone else is `id_taken`.
    public func create(id: UUID, _ draft: CategoryDraft) async throws -> ZentletCore.Category {
        let userId = try session.requireUserId()
        let draft = try draft.validated()
        let now = clock()
        return try await store.perform { context in
            if let existing = try Self.find(id, context: context) {
                guard existing.userId == userId else { throw AppError.conflict(ErrorCode.idTaken) }
                return existing.domain
            }
            let count = try context.fetchCount(FetchDescriptor<CategoryEntity>(predicate: #Predicate { $0.userId == userId }))
            guard count < CategoryDraft.maxCategoriesPerUser else { throw AppError.validation(ErrorCode.limitReached) }

            let category = CategoryEntity(
                id: id, userId: userId, name: draft.name, icon: draft.icon, color: draft.color, details: draft.description, createdAt: now
            )
            context.insert(category)
            return category.domain
        }
    }

    public func update(id: UUID, _ draft: CategoryDraft) async throws -> ZentletCore.Category {
        let userId = try session.requireUserId()
        let draft = try draft.validated()
        return try await store.perform { context in
            guard let category = try Self.find(id, context: context), category.userId == userId else { throw AppError.notFound }
            category.name = draft.name
            category.icon = draft.icon
            category.color = draft.color
            category.details = draft.description
            return category.domain
        }
    }

    public func delete(id: UUID) async throws {
        let userId = try session.requireUserId()
        try await store.perform { context in
            guard let category = try Self.find(id, context: context), category.userId == userId else { throw AppError.notFound }
            let used = try context.fetchCount(FetchDescriptor<TransactionEntity>(predicate: #Predicate { $0.categoryId == id }))
            guard used == 0 else { throw AppError.conflict(ErrorCode.hasTransactions) }
            for budget in try context.fetch(FetchDescriptor<BudgetEntity>(predicate: #Predicate { $0.categoryId == id })) {
                try context.deleteBudgetCascade(budget)
            }
            try context.delete(model: RecurringEntity.self, where: #Predicate { $0.categoryId == id })
            context.delete(category)
        }
    }

    private static func find(_ id: UUID, context: ModelContext) throws -> CategoryEntity? {
        try context.fetch(FetchDescriptor<CategoryEntity>(predicate: #Predicate { $0.id == id })).first
    }
}
