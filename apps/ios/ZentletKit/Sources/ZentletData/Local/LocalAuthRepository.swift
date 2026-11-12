import Foundation
import SwiftData
import ZentletCore

/// Development-only accounts stored on the device. Several accounts can coexist, which makes list invites
/// testable locally by signing in as another person.
public struct LocalAuthRepository: AuthRepository {
    private let store: LocalStore
    private let session: LocalSession
    private let iterations: Int
    private let deviceDefaults: UserPreference
    private let clock: @Sendable () -> Date

    public init(
        store: LocalStore, session: LocalSession, iterations: Int = 210_000,
        deviceDefaults: UserPreference = .deviceDefaults(), clock: @escaping @Sendable () -> Date = { .now }
    ) {
        self.store = store
        self.session = session
        self.iterations = iterations
        self.deviceDefaults = deviceDefaults
        self.clock = clock
    }

    public func currentUser() async throws -> User? {
        guard let userId = try session.currentUserId() else { return nil }
        let user = try await store.perform { try $0.user(userId)?.domain }
        if user == nil { try session.end() }
        return user
    }

    public func signIn(email: String, password: String) async throws -> User {
        let normalized = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let user = try await store.perform { context -> User in
            let match = try context.fetch(FetchDescriptor<UserEntity>(predicate: #Predicate { $0.email == normalized })).first
            guard let match, PasswordHasher.verify(
                password, hash: match.passwordHash, salt: match.passwordSalt, iterations: match.passwordIterations
            ) else { throw AppError.validation(ErrorCode.invalidCredentials) }
            return match.domain
        }
        try session.start(userId: user.id)
        return user
    }

    public func signUp(_ draft: SignUpDraft) async throws -> User {
        let draft = try draft.validated()
        let now = clock()
        let iterations = iterations
        let preference = deviceDefaults
        let salt = PasswordHasher.makeSalt()
        let hash = PasswordHasher.hash(draft.password, salt: salt, iterations: iterations)
        let email = draft.email

        let user = try await store.perform { context -> User in
            let taken = try context.fetchCount(FetchDescriptor<UserEntity>(predicate: #Predicate { $0.email == email })) > 0
            if taken { throw AppError.conflict(ErrorCode.emailTaken) }

            let user = UserEntity(
                id: UUID(), name: draft.name, email: email, passwordHash: hash, passwordSalt: salt,
                passwordIterations: iterations, createdAt: now
            )
            context.insert(user)
            context.insert(PreferenceEntity(
                userId: user.id, language: preference.language.rawValue, currency: preference.currency.rawValue,
                timezone: preference.timezone
            ))
            _ = try context.ensurePrivateList(for: user.id, now: now)
            return user.domain
        }
        try session.start(userId: user.id)
        return user
    }

    public func signOut() async throws {
        try session.end()
    }

    public func completeOnboarding() async throws {
        let userId = try session.requireUserId()
        let now = clock()
        try await store.perform { context in
            guard let user = try context.user(userId) else { throw AppError.unauthorized }
            if user.onboardingCompletedAt == nil { user.onboardingCompletedAt = now }
        }
    }

    public func deleteAccount(password: String) async throws {
        let userId = try session.requireUserId()
        let now = clock()
        try await store.perform { context in
            guard let user = try context.user(userId) else { throw AppError.unauthorized }
            guard PasswordHasher.verify(password, hash: user.passwordHash, salt: user.passwordSalt, iterations: user.passwordIterations) else {
                throw AppError.validation(ErrorCode.invalidCredentials)
            }
            try Self.handOverLists(of: userId, context: context, now: now)
            try Self.leaveRemainingLists(of: userId, context: context)
            for budget in try context.fetch(FetchDescriptor<BudgetEntity>(predicate: #Predicate { $0.userId == userId })) {
                try context.deleteBudgetCascade(budget)
            }
            try context.delete(model: RecurringEntity.self, where: #Predicate { $0.userId == userId })
            try context.delete(model: NotificationEntity.self, where: #Predicate { $0.userId == userId })
            try context.delete(model: TransactionEntity.self, where: #Predicate { $0.userId == userId })
            try context.delete(model: CategoryEntity.self, where: #Predicate { $0.userId == userId })
            try context.delete(model: PreferenceEntity.self, where: #Predicate { $0.userId == userId })
            try context.delete(model: InviteEntity.self, where: #Predicate { $0.createdById == userId })
            context.delete(user)
        }
        try session.end()
    }

    /// Each owned shared list goes to the earliest editor, else the earliest viewer; with nobody left it's deleted.
    private static func handOverLists(of userId: UUID, context: ModelContext, now: Date) throws {
        let owned = try context.fetch(FetchDescriptor<ListEntity>(predicate: #Predicate { $0.ownerId == userId }))
        for list in owned {
            let members = try context.members(of: list.id)
            let candidates = try members.map { member -> ListMember in
                let user = try context.user(member.userId)
                return ListMember(
                    userId: member.userId, name: user?.name ?? "", email: user?.email ?? "",
                    role: ListRole(rawValue: member.role) ?? .viewer, joinedAt: member.joinedAt
                )
            }
            guard list.privateOwnerId == nil, let successor = ListPolicy.successor(among: candidates) else {
                try context.deleteListCascade(list)
                continue
            }
            list.ownerId = successor.userId
            members.first { $0.userId == successor.userId }?.role = ListRole.owner.rawValue
            if let leaving = members.first(where: { $0.userId == userId }) { context.delete(leaving) }
            try context.notify(
                userId: successor.userId, content: .listOwned(listId: list.id, listName: list.name),
                dedupeKey: "list:\(list.id.uuidString.lowercased()):owned:\(successor.userId.uuidString.lowercased())", now: now
            )
        }
    }

    private static func leaveRemainingLists(of userId: UUID, context: ModelContext) throws {
        try context.delete(model: MemberEntity.self, where: #Predicate { $0.userId == userId })
    }
}

extension UserPreference {
    /// Device currency and time zone when supported, like the web client sync; otherwise the server defaults.
    public static func deviceDefaults(locale: Locale = .current, timeZone: TimeZone = .current) -> UserPreference {
        let currency = locale.currency.flatMap { Currency(rawValue: $0.identifier) } ?? .default
        let language: AppLanguage = locale.language.languageCode?.identifier == "en" ? .en : .es
        return UserPreference(language: language, currency: currency, timezone: timeZone.identifier)
    }
}
