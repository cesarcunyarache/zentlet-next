import Foundation
import Observation

@MainActor
@Observable
public final class ListsViewModel {
    public private(set) var memberships: [ListMembership] = []
    public private(set) var isLoading = false
    public var errorMessage: String?

    private let repository: ListRepository

    public init(repository: ListRepository) {
        self.repository = repository
    }

    public func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            memberships = try await repository.fetchMemberships()
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }
}

@MainActor
@Observable
public final class ListFormViewModel {
    public var name: String
    public var icon: String
    public var color: String
    public var description: String
    public private(set) var isSaving = false
    public var errorMessage: String?

    public let editing: TransactionList?
    private let repository: ListRepository

    public init(repository: ListRepository, editing: TransactionList? = nil) {
        self.repository = repository
        self.editing = editing
        name = editing?.name ?? ""
        icon = editing?.icon ?? "🏠"
        color = editing?.color ?? CategoryFormViewModel.palette[6]
        description = editing?.description ?? ""
    }

    public var canSave: Bool { !name.trimmingCharacters(in: .whitespaces).isEmpty && !isSaving }

    public func save() async -> TransactionList? {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        let draft = ListDraft(name: name, icon: icon, color: color, description: description)
        do {
            if let editing { return try await repository.update(id: editing.id, draft) }
            return try await repository.create(id: UUID(), draft)
        } catch {
            errorMessage = UserMessage.from(error)
            return nil
        }
    }
}

/// One list: totals, per-member breakdown, entries, members and (for the owner) invites.
@MainActor
@Observable
public final class ListDetailViewModel {
    public private(set) var detail: ListDetail?
    public private(set) var entries: [Transaction] = []
    public private(set) var invites: [ListInvite] = []
    /// The invite just created; its token is shown once to be shared.
    public private(set) var createdInvite: ListInvite?
    public private(set) var hasMoreEntries = false
    public private(set) var isLoading = false
    public var errorMessage: String?

    public let listId: UUID
    public let currentUserId: UUID
    private var entriesCursor: String?
    private let dependencies: AppDependencies
    private static let entriesPage = 50

    public init(listId: UUID, currentUserId: UUID, dependencies: AppDependencies) {
        self.listId = listId
        self.currentUserId = currentUserId
        self.dependencies = dependencies
    }

    public var role: ListRole? { detail?.membership.role }
    public var list: TransactionList? { detail?.membership.list }
    public var canManage: Bool { role.map(ListPolicy.canManage) == true && list?.isPrivate == false }
    public var canLeave: Bool { role != nil && role != .owner && list?.isPrivate == false }
    public var canContribute: Bool { role.map(ListPolicy.canContribute) == true && list?.isPrivate == false }

    /// The caller's own movements outside this list, to move into it.
    public private(set) var assignable: [Transaction] = []

    public func loadAssignable() async {
        await run {
            let page = try await self.dependencies.transactions.fetch(TransactionQuery(limit: 200))
            self.assignable = page.items.filter { $0.listId != self.listId }
        }
    }

    /// Returns true when the movements were moved.
    public func assign(_ ids: Set<UUID>) async -> Bool {
        guard !ids.isEmpty else { return false }
        let moved = await run { try await self.dependencies.listEntries.assign(listId: self.listId, transactionIds: Array(ids)) }
        if moved { await load() }
        return moved
    }

    public func canRemove(_ entry: Transaction) -> Bool {
        guard let role, list?.isPrivate == false else { return false }
        return ListPolicy.canRemoveEntry(role: role, isAuthor: entry.userId == currentUserId)
    }

    public func memberName(_ userId: UUID) -> String {
        detail?.members.first { $0.userId == userId }?.name ?? String(localized: "Former member")
    }

    /// Members sorted by expense, with their share of the list's total expense (0...1).
    public var memberShares: [(member: ListMember, totals: MemberTotals, share: Double)] {
        guard let detail else { return [] }
        let total = detail.breakdown.totals.expense
        return detail.members
            .map { member -> (member: ListMember, totals: MemberTotals, share: Double) in
                let totals = detail.breakdown.byMember[member.userId] ?? MemberTotals()
                let share = total > 0 ? NSDecimalNumber(decimal: totals.totals.expense / total).doubleValue : 0
                return (member: member, totals: totals, share: share)
            }
            .sorted { $0.totals.totals.expense > $1.totals.totals.expense }
    }

    public func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            detail = try await dependencies.lists.fetchDetail(id: listId)
            let page = try await dependencies.listEntries.entries(listId: listId, cursor: nil, limit: Self.entriesPage)
            entries = page.items
            entriesCursor = page.nextCursor
            hasMoreEntries = page.nextCursor != nil
            invites = canManage ? try await dependencies.listInvites.invites(listId: listId) : []
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }

    public func loadMoreEntries() async {
        guard let entriesCursor else { return }
        await run {
            let page = try await self.dependencies.listEntries.entries(listId: self.listId, cursor: entriesCursor, limit: Self.entriesPage)
            self.entries += page.items
            self.entriesCursor = page.nextCursor
            self.hasMoreEntries = page.nextCursor != nil
        }
    }

    public func createInvite(role: InviteRole) async {
        await run {
            self.createdInvite = try await self.dependencies.listInvites.create(listId: self.listId, role: role)
            self.invites = try await self.dependencies.listInvites.invites(listId: self.listId)
        }
    }

    /// Sends the invite by email (server only). Returns true when sent.
    public func sendEmailInvite(email: String, role: InviteRole, language: AppLanguage) async -> Bool {
        await run {
            _ = try await self.dependencies.listInvites.createEmailInvite(listId: self.listId, role: role, email: email, language: language)
            self.invites = try await self.dependencies.listInvites.invites(listId: self.listId)
        }
    }

    public var canSendEmailInvites: Bool { dependencies.hasServer }

    public func revoke(_ invite: ListInvite) async {
        await run {
            try await self.dependencies.listInvites.revoke(listId: self.listId, inviteId: invite.id)
            self.invites.removeAll { $0.id == invite.id }
        }
    }

    public func changeRole(of member: ListMember, to role: InviteRole) async {
        await run {
            try await self.dependencies.listMembers.updateRole(listId: self.listId, userId: member.userId, role: role)
            await self.load()
        }
    }

    public func remove(_ member: ListMember) async {
        await run {
            try await self.dependencies.listMembers.remove(listId: self.listId, userId: member.userId)
            await self.load()
        }
    }

    /// Returns true when the caller left the list.
    public func leave() async -> Bool {
        await run { try await self.dependencies.listMembers.remove(listId: self.listId, userId: self.currentUserId) }
    }

    public func removeEntry(_ entry: Transaction) async {
        await run {
            try await self.dependencies.listEntries.remove(listId: self.listId, transactionId: entry.id)
            await self.load()
        }
    }

    /// Returns true when the list was deleted.
    public func deleteList() async -> Bool {
        await run { try await self.dependencies.lists.delete(id: self.listId) }
    }

    @discardableResult
    private func run(_ operation: @escaping () async throws -> Void) async -> Bool {
        errorMessage = nil
        do {
            try await operation()
            return true
        } catch {
            errorMessage = UserMessage.from(error)
            return false
        }
    }
}

@MainActor
@Observable
public final class JoinListViewModel {
    public var token = ""
    public private(set) var preview: InvitePreview?
    public private(set) var isWorking = false
    public var errorMessage: String?

    private let repository: ListInviteRepository

    public init(repository: ListInviteRepository, token: String = "") {
        self.repository = repository
        self.token = token
    }

    public func loadPreview() async {
        await run { self.preview = try await self.repository.preview(token: self.token) }
    }

    /// Returns true once the user is a member (newly joined or already).
    public func accept() async -> Bool {
        var joined = false
        await run {
            _ = try await self.repository.accept(token: self.token)
            joined = true
        }
        return joined
    }

    private func run(_ operation: @escaping () async throws -> Void) async {
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }
        do {
            try await operation()
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }
}
