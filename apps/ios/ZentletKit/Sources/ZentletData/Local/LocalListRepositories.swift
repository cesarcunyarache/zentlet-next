import Foundation
import SwiftData
import ZentletCore

public struct LocalListRepository: ListRepository {
    private let store: LocalStore
    private let session: LocalSession
    private let clock: @Sendable () -> Date

    public init(store: LocalStore, session: LocalSession, clock: @escaping @Sendable () -> Date = { .now }) {
        self.store = store
        self.session = session
        self.clock = clock
    }

    public func fetchMemberships() async throws -> [ListMembership] {
        let userId = try session.requireUserId()
        let now = clock()
        return try await store.perform { context in
            _ = try context.ensurePrivateList(for: userId, now: now)
            let memberships = try context.fetch(FetchDescriptor<MemberEntity>(predicate: #Predicate { $0.userId == userId }))
            let lists = try memberships.compactMap { member -> (ListEntity, ListRole)? in
                guard let list = try context.list(member.listId) else { return nil }
                return (list, ListRole(rawValue: member.role) ?? .viewer)
            }
            return try lists
                .sorted {
                    if ($0.0.privateOwnerId != nil) != ($1.0.privateOwnerId != nil) { return $0.0.privateOwnerId != nil }
                    return $0.0.createdAt < $1.0.createdAt
                }
                .map { try Self.membership(list: $0.0, role: $0.1, context: context) }
        }
    }

    public func fetchDetail(id: UUID) async throws -> ListDetail {
        let userId = try session.requireUserId()
        return try await store.perform { context in
            let (list, role) = try context.listForMember(id, userId: userId)
            let members = try context.members(of: id).map { member -> ListMember in
                let user = try context.user(member.userId)
                return ListMember(
                    userId: member.userId, name: user?.name ?? "", email: user?.email ?? "",
                    role: ListRole(rawValue: member.role) ?? .viewer, joinedAt: member.joinedAt
                )
            }
            let breakdown = Calculations.breakdown(of: try context.transactions(inList: id).map(\.domain))
            return ListDetail(
                membership: try Self.membership(list: list, role: role, context: context), members: members, breakdown: breakdown
            )
        }
    }

    /// The list takes the creator's account currency; the creator becomes its owner.
    public func create(id: UUID, _ draft: ListDraft) async throws -> TransactionList {
        let userId = try session.requireUserId()
        let draft = try draft.validated()
        let now = clock()
        return try await store.perform { context in
            if let existing = try context.list(id) {
                guard existing.ownerId == userId else { throw AppError.conflict(ErrorCode.idTaken) }
                return existing.domain
            }
            let list = ListEntity(
                id: id, name: draft.name, icon: draft.icon, color: draft.color, details: draft.description,
                currency: try context.preference(for: userId).currency, ownerId: userId, privateOwnerId: nil, createdAt: now
            )
            context.insert(list)
            context.insert(MemberEntity(listId: id, userId: userId, role: ListRole.owner.rawValue, joinedAt: now))
            return list.domain
        }
    }

    public func update(id: UUID, _ draft: ListDraft) async throws -> TransactionList {
        let userId = try session.requireUserId()
        let draft = try draft.validated()
        return try await store.perform { context in
            let list = try Self.managedList(id, userId: userId, context: context)
            list.name = draft.name
            list.icon = draft.icon
            list.color = draft.color
            list.details = draft.description
            return list.domain
        }
    }

    public func delete(id: UUID) async throws {
        let userId = try session.requireUserId()
        try await store.perform { context in
            try context.deleteListCascade(try Self.managedList(id, userId: userId, context: context))
        }
    }

    /// Owner only, and never the private list.
    static func managedList(_ id: UUID, userId: UUID, context: ModelContext) throws -> ListEntity {
        let (list, role) = try context.listForMember(id, userId: userId)
        guard ListPolicy.canManage(role), list.privateOwnerId == nil else { throw AppError.forbidden }
        return list
    }

    private static func membership(list: ListEntity, role: ListRole, context: ModelContext) throws -> ListMembership {
        let transactions = try context.transactions(inList: list.id)
        var totals = TypeTotals()
        for transaction in transactions {
            totals.add(TransactionType(rawValue: transaction.type) ?? .expense, transaction.amount)
        }
        let listId = list.id
        let memberCount = try context.fetchCount(FetchDescriptor<MemberEntity>(predicate: #Predicate { $0.listId == listId }))
        return ListMembership(list: list.domain, role: role, memberCount: memberCount, totals: totals)
    }
}

public struct LocalListEntryRepository: ListEntryRepository {
    private let store: LocalStore
    private let session: LocalSession
    private let clock: @Sendable () -> Date

    public static let batchLimit = 1...100
    public static let pageLimit = 1...200

    public init(store: LocalStore, session: LocalSession, clock: @escaping @Sendable () -> Date = { .now }) {
        self.store = store
        self.session = session
        self.clock = clock
    }

    public func entries(listId: UUID, cursor: String?, limit: Int) async throws -> TransactionPage {
        let userId = try session.requireUserId()
        guard Self.pageLimit.contains(limit) else { throw AppError.validation("invalid_limit") }
        let offset = try LocalCursor.offset(from: cursor)
        return try await store.perform { context in
            _ = try context.listForMember(listId, userId: userId)
            let page = LocalCursor.page(try context.transactions(inList: listId).sortedForFeed(), offset: offset, limit: limit)
            return TransactionPage(items: page.items.map(\.domain), nextCursor: page.next)
        }
    }

    /// Owner or editor; shared lists only take entries in their currency; only your own transactions move.
    public func assign(listId: UUID, transactionIds: [UUID]) async throws {
        let userId = try session.requireUserId()
        let ids = Array(Set(transactionIds))
        guard Self.batchLimit.contains(ids.count) else { throw AppError.validation("invalid_batch") }
        let now = clock()
        try await store.perform { context in
            let (list, role) = try context.listForMember(listId, userId: userId)
            guard ListPolicy.canContribute(role) else { throw AppError.forbidden }
            guard ListPolicy.acceptsCurrency(of: list.domain, accountCurrency: try context.accountCurrency(of: userId)) else {
                throw AppError.conflict(ErrorCode.currencyMismatch)
            }
            let owned = try context.fetch(FetchDescriptor<TransactionEntity>(
                predicate: #Predicate { ids.contains($0.id) && $0.userId == userId }
            ))
            guard owned.count == ids.count else { throw AppError.validation(ErrorCode.transactionNotFound) }
            for transaction in owned {
                transaction.listId = listId
                transaction.updatedAt = now
            }
        }
    }

    /// The owner or the author sends the entry back to the author's private list. Not allowed on the private list.
    public func remove(listId: UUID, transactionId: UUID) async throws {
        let userId = try session.requireUserId()
        let now = clock()
        try await store.perform { context in
            let (list, role) = try context.listForMember(listId, userId: userId)
            guard list.privateOwnerId == nil else { throw AppError.forbidden }
            let entry = try context.fetch(FetchDescriptor<TransactionEntity>(
                predicate: #Predicate { $0.id == transactionId && $0.listId == listId }
            )).first
            guard let entry else { throw AppError.notFound }
            guard ListPolicy.canRemoveEntry(role: role, isAuthor: entry.userId == userId) else { throw AppError.forbidden }
            entry.listId = try context.ensurePrivateList(for: entry.userId, now: now).id
            entry.updatedAt = now
        }
    }
}

public struct LocalListMemberRepository: ListMemberRepository {
    private let store: LocalStore
    private let session: LocalSession
    private let clock: @Sendable () -> Date

    public init(store: LocalStore, session: LocalSession, clock: @escaping @Sendable () -> Date = { .now }) {
        self.store = store
        self.session = session
        self.clock = clock
    }

    public func updateRole(listId: UUID, userId targetId: UUID, role: InviteRole) async throws {
        let userId = try session.requireUserId()
        try await store.perform { context in
            _ = try LocalListRepository.managedList(listId, userId: userId, context: context)
            guard let member = try context.membership(listId: listId, userId: targetId) else {
                throw AppError.validation(ErrorCode.memberNotFound)
            }
            guard member.role != ListRole.owner.rawValue else { throw AppError.forbidden }
            member.role = role.listRole.rawValue
        }
    }

    /// The owner removes others; anyone else may only remove themself. The owner can't leave.
    /// The removed person's transactions in the list go back to their private list.
    public func remove(listId: UUID, userId targetId: UUID) async throws {
        let userId = try session.requireUserId()
        let now = clock()
        try await store.perform { context in
            let (list, role) = try context.listForMember(listId, userId: userId)
            guard list.privateOwnerId == nil else { throw AppError.forbidden }
            let isSelf = targetId == userId
            if isSelf, role == .owner { throw AppError.conflict(ErrorCode.ownerCannotLeave) }
            guard isSelf || ListPolicy.canManage(role) else { throw AppError.forbidden }
            guard let member = try context.membership(listId: listId, userId: targetId) else {
                throw AppError.validation(ErrorCode.memberNotFound)
            }
            try context.returnTransactionsToPrivateList(userId: targetId, from: listId, now: now)
            context.delete(member)
        }
    }
}

public struct LocalListInviteRepository: ListInviteRepository {
    private let store: LocalStore
    private let session: LocalSession
    private let clock: @Sendable () -> Date

    public init(store: LocalStore, session: LocalSession, clock: @escaping @Sendable () -> Date = { .now }) {
        self.store = store
        self.session = session
        self.clock = clock
    }

    public func invites(listId: UUID) async throws -> [ListInvite] {
        let userId = try session.requireUserId()
        let now = clock()
        return try await store.perform { context in
            _ = try LocalListRepository.managedList(listId, userId: userId, context: context)
            let invites = try context.fetch(FetchDescriptor<InviteEntity>(
                predicate: #Predicate { $0.listId == listId }, sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
            ))
            return invites.map { $0.domain() }.filter { ListPolicy.isUsable($0, now: now) }
        }
    }

    /// Returns the invite with its secret token; it is shown once and only its hash is kept.
    public func create(listId: UUID, role: InviteRole) async throws -> ListInvite {
        let userId = try session.requireUserId()
        let now = clock()
        let token = InviteToken.make()
        let tokenHash = InviteToken.hash(token)
        return try await store.perform { context in
            _ = try LocalListRepository.managedList(listId, userId: userId, context: context)
            let invite = InviteEntity(
                id: UUID(), listId: listId, tokenHash: tokenHash, role: role.rawValue, email: nil,
                expiresAt: now.addingTimeInterval(ListPolicy.inviteLifetime), createdById: userId, createdAt: now
            )
            context.insert(invite)
            return invite.domain(token: token)
        }
    }

    /// Sending email needs the server.
    public func createEmailInvite(listId: UUID, role: InviteRole, email: String, language: AppLanguage) async throws -> ListInvite {
        throw AppError.notImplemented("Email invites")
    }

    public func revoke(listId: UUID, inviteId: UUID) async throws {
        let userId = try session.requireUserId()
        let now = clock()
        try await store.perform { context in
            _ = try LocalListRepository.managedList(listId, userId: userId, context: context)
            let invite = try context.fetch(FetchDescriptor<InviteEntity>(
                predicate: #Predicate { $0.id == inviteId && $0.listId == listId }
            )).first
            guard let invite else { throw AppError.notFound }
            if invite.revokedAt == nil { invite.revokedAt = now }
        }
    }

    public func preview(token: String) async throws -> InvitePreview {
        let userId = try session.requireUserId()
        let now = clock()
        let tokenHash = InviteToken.hash(token.trimmingCharacters(in: .whitespacesAndNewlines))
        return try await store.perform { context in
            let (invite, list) = try Self.usableInvite(tokenHash: tokenHash, now: now, context: context)
            let owner = try context.user(list.ownerId)
            return InvitePreview(
                listName: list.name, listIcon: list.icon, ownerName: owner?.name ?? "",
                role: InviteRole(rawValue: invite.role) ?? .viewer, currency: Currency(rawValue: list.currency) ?? .default,
                alreadyMember: try context.membership(listId: list.id, userId: userId) != nil
            )
        }
    }

    /// Editors must share the list currency (viewers don't add entries). Already a member returns false.
    public func accept(token: String) async throws -> Bool {
        let userId = try session.requireUserId()
        let now = clock()
        let tokenHash = InviteToken.hash(token.trimmingCharacters(in: .whitespacesAndNewlines))
        return try await store.perform { context in
            let (invite, list) = try Self.usableInvite(tokenHash: tokenHash, now: now, context: context)
            if try context.membership(listId: list.id, userId: userId) != nil { return false }

            let role = InviteRole(rawValue: invite.role) ?? .viewer
            if role == .editor, try context.accountCurrency(of: userId).rawValue != list.currency {
                throw AppError.conflict(ErrorCode.currencyMismatch)
            }
            context.insert(MemberEntity(listId: list.id, userId: userId, role: role.listRole.rawValue, joinedAt: now))
            invite.acceptedAt = now
            try context.notify(
                userId: list.ownerId,
                content: .listJoined(listId: list.id, listName: list.name, memberName: try context.user(userId)?.name ?? ""),
                dedupeKey: "list:\(list.id.uuidString.lowercased()):joined:\(userId.uuidString.lowercased())", now: now
            )
            return true
        }
    }

    private static func usableInvite(tokenHash: String, now: Date, context: ModelContext) throws -> (InviteEntity, ListEntity) {
        let invite = try context.fetch(FetchDescriptor<InviteEntity>(predicate: #Predicate { $0.tokenHash == tokenHash })).first
        guard let invite, ListPolicy.isUsable(invite.domain(), now: now), let list = try context.list(invite.listId) else {
            throw AppError.conflict(ErrorCode.inviteInvalid)
        }
        return (invite, list)
    }
}
