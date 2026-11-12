import Foundation
import Testing
import ZentletCore
@testable import ZentletData

/// Ana owns a shared "Home" list; Ben joins through an invite. Both accounts live on the same local device.
struct SharedListScenario {
    let device: LocalHarness
    let home: TransactionList
    let anaFood: ZentletCore.Category
    let ana: User
    let ben: User

    static func make(benRole: InviteRole = .editor, benCurrency: Currency = .pen) async throws -> SharedListScenario {
        let device = try LocalHarness()
        let ben = try await device.signUp("Ben")
        if benCurrency != .pen { _ = try await device.preferences.update(UserPreference(currency: benCurrency)) }

        let ana = try await device.signUp("Ana")
        let anaFood = try await device.category()
        let home = try await device.lists.create(id: UUID(), ListDraft(name: "Home", icon: "🏠", color: "#fff"))
        let invite = try await device.invites.create(listId: home.id, role: benRole)

        try await device.signIn("Ben")
        if benCurrency == .pen || benRole == .viewer { #expect(try await device.invites.accept(token: invite.token!)) }
        try await device.signIn("Ana")
        return SharedListScenario(device: device, home: home, anaFood: anaFood, ana: ana, ben: ben)
    }
}

struct LocalListTests {
    @Test func inviteAcceptanceAddsTheMemberOnce() async throws {
        let scenario = try await SharedListScenario.make()
        let detail = try await scenario.device.lists.fetchDetail(id: scenario.home.id)
        #expect(detail.members.map(\.name) == ["Ana", "Ben"])
        #expect(detail.members.map(\.role) == [.owner, .editor])
        #expect(detail.membership.memberCount == 2)
    }

    @Test func usedRevokedAndExpiredInvitesAreInvalid() async throws {
        let device = try LocalHarness()
        try await device.signUp("Ben")
        try await device.signUp("Ana")
        let home = try await device.lists.create(id: UUID(), ListDraft(name: "Home", icon: "x", color: "c"))
        let revoked = try await device.invites.create(listId: home.id, role: .viewer)
        try await device.invites.revoke(listId: home.id, inviteId: revoked.id)
        #expect(try await device.invites.invites(listId: home.id).isEmpty)

        try await device.signIn("Ben")
        await #expect(throws: AppError.conflict(ErrorCode.inviteInvalid)) { try await device.invites.accept(token: revoked.token!) }

        let later = LocalListInviteRepository(store: device.store, session: device.session, clock: { Date(timeIntervalSince1970: 1_800_000_000 + ListPolicy.inviteLifetime + 3_600) })
        try await device.signIn("Ana")
        let expiring = try await device.invites.create(listId: home.id, role: .viewer)
        try await device.signIn("Ben")
        await #expect(throws: AppError.conflict(ErrorCode.inviteInvalid)) { try await later.accept(token: expiring.token!) }
    }

    @Test func editorsMustShareTheListCurrency() async throws {
        let device = try LocalHarness()
        try await device.signUp("Ben")
        _ = try await device.preferences.update(UserPreference(currency: .usd))
        try await device.signUp("Ana")
        let home = try await device.lists.create(id: UUID(), ListDraft(name: "Home", icon: "x", color: "c"))
        let editorInvite = try await device.invites.create(listId: home.id, role: .editor)
        let viewerInvite = try await device.invites.create(listId: home.id, role: .viewer)

        try await device.signIn("Ben")
        await #expect(throws: AppError.conflict(ErrorCode.currencyMismatch)) { try await device.invites.accept(token: editorInvite.token!) }
        #expect(try await device.invites.accept(token: viewerInvite.token!))
        #expect(try await device.invites.preview(token: editorInvite.token!).alreadyMember)
        #expect(try await !device.invites.accept(token: editorInvite.token!))
    }

    @Test func transactionsLandInTheListOnlyWhenAllowed() async throws {
        let scenario = try await SharedListScenario.make(benRole: .viewer)
        let device = scenario.device
        let anaEntry = try await device.expense(30, category: scenario.anaFood.id, list: scenario.home.id)
        #expect(anaEntry.listId == scenario.home.id)

        try await device.signIn("Ben")
        let benFood = try await device.category()
        let benEntry = try await device.expense(20, category: benFood.id, list: scenario.home.id)
        #expect(benEntry.listId == (try await device.privateListId()))
    }

    @Test func breakdownCoversEveryMemberWhileFeedsStayPersonal() async throws {
        let scenario = try await SharedListScenario.make()
        let device = scenario.device
        _ = try await device.expense(30, category: scenario.anaFood.id, list: scenario.home.id)
        try await device.signIn("Ben")
        let benFood = try await device.category()
        _ = try await device.expense(20, category: benFood.id, list: scenario.home.id)

        let detail = try await device.lists.fetchDetail(id: scenario.home.id)
        #expect(detail.breakdown.totals.expense == 50)
        #expect(detail.breakdown.byMember[scenario.ana.id]?.totals.expense == 30)
        #expect(detail.breakdown.byMember[scenario.ben.id]?.count == 1)
        #expect(try await device.entries.entries(listId: scenario.home.id, cursor: nil, limit: 50).items.count == 2)
        #expect(try await device.transactions.fetch(TransactionQuery(listId: scenario.home.id)).items.count == 1)
    }

    @Test func assignMovesOnlyOwnTransactionsInTheListCurrency() async throws {
        let scenario = try await SharedListScenario.make()
        let device = scenario.device
        let anaEntry = try await device.expense(10, category: scenario.anaFood.id)
        try await device.entries.assign(listId: scenario.home.id, transactionIds: [anaEntry.id])
        #expect(try await device.transactions.fetch(id: anaEntry.id)?.listId == scenario.home.id)

        try await device.signIn("Ben")
        await #expect(throws: AppError.validation(ErrorCode.transactionNotFound)) {
            try await device.entries.assign(listId: scenario.home.id, transactionIds: [anaEntry.id])
        }
        _ = try await device.preferences.update(UserPreference(currency: .eur))
        let benFood = try await device.category()
        let benEntry = try await device.expense(5, category: benFood.id)
        await #expect(throws: AppError.conflict(ErrorCode.currencyMismatch)) {
            try await device.entries.assign(listId: scenario.home.id, transactionIds: [benEntry.id])
        }
    }

    @Test func removingAnEntryReturnsItToTheAuthorsPrivateList() async throws {
        let scenario = try await SharedListScenario.make()
        let device = scenario.device
        try await device.signIn("Ben")
        let benFood = try await device.category()
        let benEntry = try await device.expense(5, category: benFood.id, list: scenario.home.id)
        let benPrivate = try await device.privateListId()

        try await device.signIn("Ana")
        try await device.entries.remove(listId: scenario.home.id, transactionId: benEntry.id)
        try await device.signIn("Ben")
        #expect(try await device.transactions.fetch(id: benEntry.id)?.listId == benPrivate)
    }

    @Test func nonAuthorEditorsCannotRemoveOthersEntries() async throws {
        let scenario = try await SharedListScenario.make()
        let device = scenario.device
        let anaEntry = try await device.expense(10, category: scenario.anaFood.id, list: scenario.home.id)
        try await device.signIn("Ben")
        await #expect(throws: AppError.forbidden) { try await device.entries.remove(listId: scenario.home.id, transactionId: anaEntry.id) }
    }

    @Test func membersLeaveTakingTheirEntriesButTheOwnerCannot() async throws {
        let scenario = try await SharedListScenario.make()
        let device = scenario.device
        await #expect(throws: AppError.conflict(ErrorCode.ownerCannotLeave)) {
            try await device.members.remove(listId: scenario.home.id, userId: scenario.ana.id)
        }

        try await device.signIn("Ben")
        let benFood = try await device.category()
        let benEntry = try await device.expense(5, category: benFood.id, list: scenario.home.id)
        try await device.members.remove(listId: scenario.home.id, userId: scenario.ben.id)
        #expect(try await device.transactions.fetch(id: benEntry.id)?.listId == (try await device.privateListId()))
        await #expect(throws: AppError.notFound) { try await device.lists.fetchDetail(id: scenario.home.id) }
    }

    @Test func onlyTheOwnerManagesRolesAndTheList() async throws {
        let scenario = try await SharedListScenario.make()
        let device = scenario.device
        try await device.members.updateRole(listId: scenario.home.id, userId: scenario.ben.id, role: .viewer)
        #expect(try await device.lists.fetchDetail(id: scenario.home.id).members.last?.role == .viewer)
        await #expect(throws: AppError.forbidden) {
            try await device.members.updateRole(listId: scenario.home.id, userId: scenario.ana.id, role: .viewer)
        }

        try await device.signIn("Ben")
        await #expect(throws: AppError.forbidden) {
            try await device.lists.update(id: scenario.home.id, ListDraft(name: "Mine", icon: "x", color: "c"))
        }
        await #expect(throws: AppError.forbidden) { try await device.invites.create(listId: scenario.home.id, role: .viewer) }
    }

    @Test func privateListCannotBeEditedOrDeleted() async throws {
        let device = try LocalHarness()
        try await device.signUp("Ana")
        let privateId = try await device.privateListId()
        await #expect(throws: AppError.forbidden) { try await device.lists.delete(id: privateId) }
        await #expect(throws: AppError.forbidden) { try await device.invites.create(listId: privateId, role: .viewer) }
    }

    @Test func deletingAListDeletesEveryEntryInIt() async throws {
        let scenario = try await SharedListScenario.make()
        let device = scenario.device
        try await device.signIn("Ben")
        let benFood = try await device.category()
        let benEntry = try await device.expense(5, category: benFood.id, list: scenario.home.id)

        try await device.signIn("Ana")
        try await device.lists.delete(id: scenario.home.id)
        try await device.signIn("Ben")
        #expect(try await device.transactions.fetch(id: benEntry.id) == nil)
        #expect(try await device.lists.fetchMemberships().count == 1)
    }

    @Test func deletingTheOwnerAccountHandsTheListOver() async throws {
        let scenario = try await SharedListScenario.make()
        let device = scenario.device
        let solo = try await device.lists.create(id: UUID(), ListDraft(name: "Solo", icon: "x", color: "c"))
        try await device.auth.deleteAccount(password: "password1")
        #expect(try await device.auth.currentUser() == nil)

        try await device.signIn("Ben")
        let lists = try await device.lists.fetchMemberships()
        let home = try #require(lists.first { $0.list.id == scenario.home.id })
        #expect(home.role == .owner)
        #expect(home.memberCount == 1)
        #expect(!lists.contains { $0.list.id == solo.id })
        await #expect(throws: AppError.validation(ErrorCode.invalidCredentials)) { try await device.signIn("Ana") }
    }
}
