import Foundation

/// Contracts the presentation layer depends on. Local (SwiftData) and remote (REST) sources implement them;
/// the caller is always the signed-in user, like a request carrying a session.

public protocol AuthRepository: Sendable {
    func currentUser() async throws -> User?
    func signIn(email: String, password: String) async throws -> User
    func signUp(_ draft: SignUpDraft) async throws -> User
    func signOut() async throws
    func completeOnboarding() async throws
    /// Hands over owned lists, then deletes the account and everything it owns.
    func deleteAccount(password: String) async throws
}

public protocol PreferenceRepository: Sendable {
    func fetch() async throws -> UserPreference
    func update(_ preference: UserPreference) async throws -> UserPreference
}

public protocol CategoryRepository: Sendable {
    /// Newest first.
    func fetchAll() async throws -> [Category]
    func create(id: UUID, _ draft: CategoryDraft) async throws -> Category
    func update(id: UUID, _ draft: CategoryDraft) async throws -> Category
    /// Fails with `has_transactions` while transactions use the category.
    func delete(id: UUID) async throws
}

public struct TransactionQuery: Hashable, Sendable {
    public var range: DayRange
    public var listId: UUID?
    public var type: TransactionType?
    public var categoryId: UUID?
    public var search: String?
    public var cursor: String?
    public var limit: Int

    public static let maxSearchLength = 60
    public static let limitRange = 1...500

    public init(
        range: DayRange = .allTime, listId: UUID? = nil, type: TransactionType? = nil, categoryId: UUID? = nil,
        search: String? = nil, cursor: String? = nil, limit: Int = 200
    ) {
        self.range = range
        self.listId = listId
        self.type = type
        self.categoryId = categoryId
        self.search = search
        self.cursor = cursor
        self.limit = limit
    }
}

public protocol TransactionRepository: Sendable {
    /// The caller's own transactions, newest first (date, then creation).
    func fetch(_ query: TransactionQuery) async throws -> TransactionPage
    func fetch(id: UUID) async throws -> Transaction?
    /// Lands in `listId` when allowed, otherwise in the private list. With `recurrence` it also starts a series
    /// and always goes to the private list.
    func create(id: UUID, _ draft: TransactionDraft, listId: UUID?, recurrence: RecurrenceFrequency?) async throws -> Transaction
    /// The list can't be changed here; use `ListEntryRepository`.
    func update(id: UUID, _ draft: TransactionDraft) async throws -> Transaction
    func delete(id: UUID) async throws
    /// Totals of the caller's own transactions.
    func summary(range: DayRange, listId: UUID?) async throws -> TransactionSummary
}

extension TransactionRepository {
    public func create(id: UUID, _ draft: TransactionDraft, listId: UUID?) async throws -> Transaction {
        try await create(id: id, draft, listId: listId, recurrence: nil)
    }
}

public protocol ListRepository: Sendable {
    /// Private list first, then the rest by creation.
    func fetchMemberships() async throws -> [ListMembership]
    func fetchDetail(id: UUID) async throws -> ListDetail
    func create(id: UUID, _ draft: ListDraft) async throws -> TransactionList
    func update(id: UUID, _ draft: ListDraft) async throws -> TransactionList
    /// Deletes the list and every transaction in it.
    func delete(id: UUID) async throws
}

public protocol ListEntryRepository: Sendable {
    /// Every member's transactions in the list.
    func entries(listId: UUID, cursor: String?, limit: Int) async throws -> TransactionPage
    /// Moves the caller's own transactions into the list.
    func assign(listId: UUID, transactionIds: [UUID]) async throws
    /// Sends the transaction back to its author's private list.
    func remove(listId: UUID, transactionId: UUID) async throws
}

public protocol ListMemberRepository: Sendable {
    func updateRole(listId: UUID, userId: UUID, role: InviteRole) async throws
    /// The owner removes someone, or a member removes themself (leave).
    func remove(listId: UUID, userId: UUID) async throws
}

public protocol ListInviteRepository: Sendable {
    func invites(listId: UUID) async throws -> [ListInvite]
    func create(listId: UUID, role: InviteRole) async throws -> ListInvite
    func revoke(listId: UUID, inviteId: UUID) async throws
    func preview(token: String) async throws -> InvitePreview
    /// Returns false when the caller already was a member.
    func accept(token: String) async throws -> Bool
}

public protocol BudgetRepository: Sendable {
    func fetchAll() async throws -> [Budget]
    /// Starts with the default 80% alert.
    func create(id: UUID, _ draft: BudgetDraft) async throws -> Budget
    func delete(id: UUID) async throws
    /// Sets the limit from the period starting at `effectiveFrom` onwards.
    func setLimit(budgetId: UUID, effectiveFrom: CalendarDay, amount: Decimal) async throws -> Budget
    func alerts(budgetId: UUID) async throws -> [BudgetAlert]
    func replaceAlerts(budgetId: UUID, _ alerts: [BudgetAlert]) async throws -> [BudgetAlert]
}

public protocol RecurringRepository: Sendable {
    func fetch(id: UUID) async throws -> RecurringTransaction
    /// Stops the series; movements already created stay.
    func stop(id: UUID) async throws
    /// Creates every occurrence due up to today. The server does it on a schedule; local mode on app launch.
    func materializeDue() async throws
}

public protocol NotificationRepository: Sendable {
    func feed() async throws -> NotificationFeed
    func markAllRead() async throws
}

public struct ExportFile: Sendable {
    public let data: Data
    public let fileName: String

    public init(data: Data, fileName: String) {
        self.data = data
        self.fileName = fileName
    }
}

public protocol DataExportRepository: Sendable {
    /// Every movement of the account as a spreadsheet file.
    func export(language: AppLanguage, currency: Currency) async throws -> ExportFile
}

/// Everything the UI needs, as protocols. Built by the dependency container for the configured source.
public struct AppDependencies: Sendable {
    public let auth: AuthRepository
    public let preferences: PreferenceRepository
    public let categories: CategoryRepository
    public let transactions: TransactionRepository
    public let lists: ListRepository
    public let listEntries: ListEntryRepository
    public let listMembers: ListMemberRepository
    public let listInvites: ListInviteRepository
    public let budgets: BudgetRepository
    public let recurring: RecurringRepository
    public let notifications: NotificationRepository
    public let exports: DataExportRepository
    public let clock: @Sendable () -> Date

    public init(
        auth: AuthRepository, preferences: PreferenceRepository, categories: CategoryRepository,
        transactions: TransactionRepository, lists: ListRepository, listEntries: ListEntryRepository,
        listMembers: ListMemberRepository, listInvites: ListInviteRepository, budgets: BudgetRepository,
        recurring: RecurringRepository, notifications: NotificationRepository, exports: DataExportRepository, clock: @escaping @Sendable () -> Date = { .now }
    ) {
        self.auth = auth
        self.preferences = preferences
        self.categories = categories
        self.transactions = transactions
        self.lists = lists
        self.listEntries = listEntries
        self.listMembers = listMembers
        self.listInvites = listInvites
        self.budgets = budgets
        self.recurring = recurring
        self.notifications = notifications
        self.exports = exports
        self.clock = clock
    }
}
