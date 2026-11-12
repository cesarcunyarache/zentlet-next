import Foundation
import SwiftData

/// SwiftData persistence models. Relations are stored as UUID foreign keys, like the server schema,
/// so the same ids can be sent to the API later. They never leave this module: repositories map them to domain types.

@Model
final class UserEntity {
    #Unique<UserEntity>([\.id], [\.email])
    var id: UUID
    var name: String
    var email: String
    var passwordHash: Data
    var passwordSalt: Data
    var passwordIterations: Int
    var onboardingCompletedAt: Date?
    var createdAt: Date

    init(id: UUID, name: String, email: String, passwordHash: Data, passwordSalt: Data, passwordIterations: Int, createdAt: Date) {
        self.id = id
        self.name = name
        self.email = email
        self.passwordHash = passwordHash
        self.passwordSalt = passwordSalt
        self.passwordIterations = passwordIterations
        self.createdAt = createdAt
    }
}

@Model
final class PreferenceEntity {
    #Unique<PreferenceEntity>([\.userId])
    var userId: UUID
    var language: String
    var currency: String
    var timezone: String

    init(userId: UUID, language: String, currency: String, timezone: String) {
        self.userId = userId
        self.language = language
        self.currency = currency
        self.timezone = timezone
    }
}

@Model
final class CategoryEntity {
    #Unique<CategoryEntity>([\.id])
    var id: UUID
    var userId: UUID
    var name: String
    var icon: String
    var color: String
    var details: String?
    var createdAt: Date

    init(id: UUID, userId: UUID, name: String, icon: String, color: String, details: String?, createdAt: Date) {
        self.id = id
        self.userId = userId
        self.name = name
        self.icon = icon
        self.color = color
        self.details = details
        self.createdAt = createdAt
    }
}

@Model
final class TransactionEntity {
    #Unique<TransactionEntity>([\.id])
    #Index<TransactionEntity>([\.userId, \.dayKey], [\.listId, \.dayKey], [\.categoryId])
    var id: UUID
    var userId: UUID
    var listId: UUID
    var categoryId: UUID
    var type: String
    var amount: Decimal
    var details: String?
    var reference: String?
    /// `CalendarDay.key` (yyyymmdd) so ranges are plain integer comparisons.
    var dayKey: Int
    var recurringTransactionId: UUID?
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID, userId: UUID, listId: UUID, categoryId: UUID, type: String, amount: Decimal, details: String?,
        reference: String?, dayKey: Int, createdAt: Date, recurringTransactionId: UUID? = nil
    ) {
        self.recurringTransactionId = recurringTransactionId
        self.id = id
        self.userId = userId
        self.listId = listId
        self.categoryId = categoryId
        self.type = type
        self.amount = amount
        self.details = details
        self.reference = reference
        self.dayKey = dayKey
        self.createdAt = createdAt
        self.updatedAt = createdAt
    }
}

@Model
final class ListEntity {
    #Unique<ListEntity>([\.id], [\.privateOwnerId])
    var id: UUID
    var name: String
    var icon: String
    var color: String
    var details: String?
    var currency: String
    var ownerId: UUID
    /// Set only on a user's private list (one per user).
    var privateOwnerId: UUID?
    var createdAt: Date

    init(id: UUID, name: String, icon: String, color: String, details: String?, currency: String, ownerId: UUID, privateOwnerId: UUID?, createdAt: Date) {
        self.id = id
        self.name = name
        self.icon = icon
        self.color = color
        self.details = details
        self.currency = currency
        self.ownerId = ownerId
        self.privateOwnerId = privateOwnerId
        self.createdAt = createdAt
    }
}

@Model
final class MemberEntity {
    #Unique<MemberEntity>([\.listId, \.userId])
    var listId: UUID
    var userId: UUID
    var role: String
    var joinedAt: Date

    init(listId: UUID, userId: UUID, role: String, joinedAt: Date) {
        self.listId = listId
        self.userId = userId
        self.role = role
        self.joinedAt = joinedAt
    }
}

@Model
final class InviteEntity {
    #Unique<InviteEntity>([\.id], [\.tokenHash])
    var id: UUID
    var listId: UUID
    var tokenHash: String
    var role: String
    var email: String?
    var expiresAt: Date
    var createdById: UUID
    var createdAt: Date
    var acceptedAt: Date?
    var revokedAt: Date?

    init(id: UUID, listId: UUID, tokenHash: String, role: String, email: String?, expiresAt: Date, createdById: UUID, createdAt: Date) {
        self.id = id
        self.listId = listId
        self.tokenHash = tokenHash
        self.role = role
        self.email = email
        self.expiresAt = expiresAt
        self.createdById = createdById
        self.createdAt = createdAt
    }
}

@Model
final class BudgetEntity {
    #Unique<BudgetEntity>([\.id], [\.listId, \.categoryId])
    var id: UUID
    var userId: UUID
    var categoryId: UUID
    var listId: UUID
    var kind: String
    var periodUnit: String
    var periodCount: Int
    var startDayKey: Int
    var createdAt: Date

    init(id: UUID, userId: UUID, categoryId: UUID, listId: UUID, kind: String, periodUnit: String, periodCount: Int, startDayKey: Int, createdAt: Date) {
        self.id = id
        self.userId = userId
        self.categoryId = categoryId
        self.listId = listId
        self.kind = kind
        self.periodUnit = periodUnit
        self.periodCount = periodCount
        self.startDayKey = startDayKey
        self.createdAt = createdAt
    }
}

@Model
final class BudgetLimitEntity {
    #Unique<BudgetLimitEntity>([\.budgetId, \.effectiveFromKey])
    var budgetId: UUID
    var effectiveFromKey: Int
    var amount: Decimal

    init(budgetId: UUID, effectiveFromKey: Int, amount: Decimal) {
        self.budgetId = budgetId
        self.effectiveFromKey = effectiveFromKey
        self.amount = amount
    }
}

@Model
final class BudgetAlertEntity {
    #Unique<BudgetAlertEntity>([\.id])
    var id: UUID
    var budgetId: UUID
    var kind: String
    var value: Decimal

    init(id: UUID, budgetId: UUID, kind: String, value: Decimal) {
        self.id = id
        self.budgetId = budgetId
        self.kind = kind
        self.value = value
    }
}

@Model
final class RecurringEntity {
    #Unique<RecurringEntity>([\.id])
    var id: UUID
    var userId: UUID
    var categoryId: UUID
    var type: String
    var amount: Decimal
    var details: String?
    var frequency: String
    var anchorDayKey: Int
    var nextDueDayKey: Int
    var createdAt: Date

    init(
        id: UUID, userId: UUID, categoryId: UUID, type: String, amount: Decimal, details: String?, frequency: String,
        anchorDayKey: Int, nextDueDayKey: Int, createdAt: Date
    ) {
        self.id = id
        self.userId = userId
        self.categoryId = categoryId
        self.type = type
        self.amount = amount
        self.details = details
        self.frequency = frequency
        self.anchorDayKey = anchorDayKey
        self.nextDueDayKey = nextDueDayKey
        self.createdAt = createdAt
    }
}

@Model
final class NotificationEntity {
    #Unique<NotificationEntity>([\.id], [\.userId, \.dedupeKey])
    var id: UUID
    var userId: UUID
    var type: String
    /// JSON of `NotificationPayload`.
    var payload: Data
    var dedupeKey: String
    var readAt: Date?
    var createdAt: Date

    init(id: UUID, userId: UUID, type: String, payload: Data, dedupeKey: String, createdAt: Date) {
        self.id = id
        self.userId = userId
        self.type = type
        self.payload = payload
        self.dedupeKey = dedupeKey
        self.createdAt = createdAt
    }
}

public enum LocalDatabase {
    static let models: [any PersistentModel.Type] = [
        UserEntity.self, PreferenceEntity.self, CategoryEntity.self, TransactionEntity.self,
        ListEntity.self, MemberEntity.self, InviteEntity.self, BudgetEntity.self, BudgetLimitEntity.self,
        BudgetAlertEntity.self, RecurringEntity.self, NotificationEntity.self,
    ]

    /// On-disk store in Application Support (survives relaunches), or an in-memory one for tests and previews.
    public static func makeContainer(inMemory: Bool = false) throws -> ModelContainer {
        let schema = Schema(models)
        let configuration = ModelConfiguration("Zentlet", schema: schema, isStoredInMemoryOnly: inMemory)
        return try ModelContainer(for: schema, configurations: [configuration])
    }

    /// On-disk store at an explicit location (used to prove data survives reopening the store).
    public static func makeContainer(url: URL) throws -> ModelContainer {
        let schema = Schema(models)
        return try ModelContainer(for: schema, configurations: [ModelConfiguration(schema: schema, url: url)])
    }
}
