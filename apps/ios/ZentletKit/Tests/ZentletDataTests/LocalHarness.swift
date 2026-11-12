import Foundation
import ZentletCore
@testable import ZentletData

/// Deterministic clock that moves one second per reading, so creation order is well defined.
final class Ticker: @unchecked Sendable {
    private let lock = NSLock()
    private var current: Date

    init(start: Date) { current = start }

    func next() -> Date {
        lock.withLock {
            current = current.addingTimeInterval(1)
            return current
        }
    }
}

/// A local "device" with its own store, where several people can sign in in turn.
struct LocalHarness {
    let store: LocalStore
    let tokens = InMemoryTokenStore()
    let clock: @Sendable () -> Date

    init(store: LocalStore? = nil, now: Date = Date(timeIntervalSince1970: 1_800_000_000)) throws {
        self.store = try store ?? LocalStore(container: LocalDatabase.makeContainer(inMemory: true))
        let ticker = Ticker(start: now)
        clock = { ticker.next() }
    }

    var session: LocalSession { LocalSession(store: tokens) }
    var auth: LocalAuthRepository {
        LocalAuthRepository(store: store, session: session, iterations: 1_000, deviceDefaults: UserPreference(currency: .pen), clock: clock)
    }
    var preferences: LocalPreferenceRepository { LocalPreferenceRepository(store: store, session: session) }
    var categories: LocalCategoryRepository { LocalCategoryRepository(store: store, session: session, clock: clock) }
    var transactions: LocalTransactionRepository { LocalTransactionRepository(store: store, session: session, clock: clock) }
    var lists: LocalListRepository { LocalListRepository(store: store, session: session, clock: clock) }
    var entries: LocalListEntryRepository { LocalListEntryRepository(store: store, session: session, clock: clock) }
    var members: LocalListMemberRepository { LocalListMemberRepository(store: store, session: session, clock: clock) }
    var invites: LocalListInviteRepository { LocalListInviteRepository(store: store, session: session, clock: clock) }

    @discardableResult
    func signUp(_ name: String, password: String = "password1") async throws -> User {
        try await auth.signUp(SignUpDraft(name: name, email: "\(name.lowercased())@mail.com", password: password, acceptedLegalTerms: true))
    }

    func signIn(_ name: String, password: String = "password1") async throws {
        _ = try await auth.signIn(email: "\(name.lowercased())@mail.com", password: password)
    }

    func category(_ name: String = "Food") async throws -> ZentletCore.Category {
        try await categories.create(id: UUID(), CategoryDraft(name: name, icon: "🍔", color: "#000"))
    }

    func expense(_ amount: Decimal, category: UUID, list: UUID? = nil, day: String = "2027-01-10") async throws -> Transaction {
        try await transactions.create(
            id: UUID(), TransactionDraft(type: .expense, amount: amount, categoryId: category, transactionDate: CalendarDay(iso: day)!),
            listId: list
        )
    }

    func privateListId() async throws -> UUID {
        try await lists.fetchMemberships().first { $0.list.isPrivate }!.list.id
    }
}
