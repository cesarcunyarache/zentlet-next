import Foundation
import Testing
@testable import ZentletCore

struct DraftValidationTests {
    @Test func categoryTrimsAndAcceptsLimits() throws {
        let draft = try CategoryDraft(name: "  Food  ", icon: "🍔", color: "#FF0000", description: "  ").validated()
        #expect(draft.name == "Food")
        #expect(draft.description == nil)
        #expect(throws: Never.self) { try CategoryDraft(name: String(repeating: "a", count: 60), icon: "x", color: "c").validated() }
    }

    @Test func categoryRejectsInvalidFields() {
        #expect(throws: AppError.validation(ErrorCode.nameRequired)) { try CategoryDraft(name: "   ", icon: "x", color: "c").validated() }
        #expect(throws: AppError.validation(ErrorCode.nameTooLong)) {
            try CategoryDraft(name: String(repeating: "a", count: 61), icon: "x", color: "c").validated()
        }
        #expect(throws: AppError.validation(ErrorCode.iconInvalid)) { try CategoryDraft(name: "a", icon: "", color: "c").validated() }
        #expect(throws: AppError.validation(ErrorCode.colorInvalid)) {
            try CategoryDraft(name: "a", icon: "x", color: String(repeating: "c", count: 33)).validated()
        }
        #expect(throws: AppError.validation(ErrorCode.descriptionTooLong)) {
            try CategoryDraft(name: "a", icon: "x", color: "c", description: String(repeating: "d", count: 201)).validated()
        }
    }

    @Test(arguments: [Decimal(0), Decimal(-1), Decimal(string: "1.005")!, Decimal(10_000_000_000)])
    func transactionRejectsInvalidAmounts(amount: Decimal) {
        let draft = TransactionDraft(type: .expense, amount: amount, categoryId: UUID(), transactionDate: CalendarDay(iso: "2026-01-01")!)
        #expect(throws: AppError.validation(ErrorCode.amountInvalid)) { try draft.validated() }
    }

    @Test func transactionAcceptsCentsAndMaxAmount() throws {
        let day = CalendarDay(iso: "2026-01-01")!
        _ = try TransactionDraft(type: .income, amount: Decimal(string: "0.01")!, categoryId: UUID(), transactionDate: day).validated()
        _ = try TransactionDraft(type: .income, amount: Money.maxAmount, categoryId: UUID(), transactionDate: day).validated()
    }

    @Test func transactionLimitsDescriptionAndReference() {
        let day = CalendarDay(iso: "2026-01-01")!
        let long = String(repeating: "x", count: 201)
        #expect(throws: AppError.validation(ErrorCode.descriptionTooLong)) {
            try TransactionDraft(type: .expense, amount: 1, categoryId: UUID(), transactionDate: day, description: long).validated()
        }
        #expect(throws: AppError.validation(ErrorCode.referenceTooLong)) {
            try TransactionDraft(type: .expense, amount: 1, categoryId: UUID(), transactionDate: day, reference: long).validated()
        }
    }

    @Test func signUpRequiresConsentValidEmailAndPassword() throws {
        #expect(throws: AppError.validation(ErrorCode.legalConsentRequired)) {
            try SignUpDraft(name: "Ana", email: "ana@mail.com", password: "12345678", acceptedLegalTerms: false).validated()
        }
        #expect(throws: AppError.validation(ErrorCode.emailInvalid)) {
            try SignUpDraft(name: "Ana", email: "ana@mail", password: "12345678", acceptedLegalTerms: true).validated()
        }
        #expect(throws: AppError.validation(ErrorCode.passwordTooShort)) {
            try SignUpDraft(name: "Ana", email: "ana@mail.com", password: "1234567", acceptedLegalTerms: true).validated()
        }
        let draft = try SignUpDraft(name: " Ana ", email: " Ana@Mail.com ", password: "12345678", acceptedLegalTerms: true).validated()
        #expect(draft.email == "ana@mail.com")
        #expect(draft.name == "Ana")
    }
}

struct ListPolicyTests {
    private func list(currency: Currency, isPrivate: Bool = false) -> TransactionList {
        TransactionList(id: UUID(), name: "L", icon: "x", color: "c", description: nil, currency: currency,
                        isPrivate: isPrivate)
    }

    @Test func rolesGrantTheExpectedActions() {
        #expect(ListPolicy.canManage(.owner))
        #expect(!ListPolicy.canManage(.editor))
        #expect(ListPolicy.canContribute(.editor))
        #expect(!ListPolicy.canContribute(.viewer))
        #expect(ListPolicy.canRemoveEntry(role: .viewer, isAuthor: true))
        #expect(!ListPolicy.canRemoveEntry(role: .editor, isAuthor: false))
        #expect(ListPolicy.canRemoveEntry(role: .owner, isAuthor: false))
    }

    @Test func transactionFallsBackToPrivateListWhenNotAllowed() {
        let privateId = UUID()
        let shared = list(currency: .pen)
        #expect(ListPolicy.targetListId(requested: shared, role: .editor, privateListId: privateId, accountCurrency: .pen) == shared.id)
        #expect(ListPolicy.targetListId(requested: shared, role: .viewer, privateListId: privateId, accountCurrency: .pen) == privateId)
        #expect(ListPolicy.targetListId(requested: shared, role: .owner, privateListId: privateId, accountCurrency: .usd) == privateId)
        #expect(ListPolicy.targetListId(requested: nil, role: nil, privateListId: privateId, accountCurrency: .pen) == privateId)
    }

    @Test func privateListAcceptsAnyCurrency() {
        #expect(ListPolicy.acceptsCurrency(of: list(currency: .pen, isPrivate: true), accountCurrency: .usd))
    }

    @Test func inviteIsUsableOnlyWhilePendingAndUnexpired() {
        let now = Date(timeIntervalSince1970: 1_000_000)
        func invite(expires: Date, accepted: Date? = nil, revoked: Date? = nil) -> ListInvite {
            ListInvite(id: UUID(), listId: UUID(), role: .viewer, email: nil, expiresAt: expires, createdAt: now,
                       acceptedAt: accepted, revokedAt: revoked, token: nil)
        }
        #expect(ListPolicy.isUsable(invite(expires: now.addingTimeInterval(1)), now: now))
        #expect(!ListPolicy.isUsable(invite(expires: now), now: now))
        #expect(!ListPolicy.isUsable(invite(expires: now.addingTimeInterval(1), accepted: now), now: now))
        #expect(!ListPolicy.isUsable(invite(expires: now.addingTimeInterval(1), revoked: now), now: now))
    }

    @Test func successorIsEarliestEditorThenEarliestViewer() {
        let base = Date(timeIntervalSince1970: 0)
        func member(_ role: ListRole, _ offset: TimeInterval) -> ListMember {
            ListMember(userId: UUID(), name: "", email: "", role: role, joinedAt: base.addingTimeInterval(offset))
        }
        let owner = member(.owner, 0)
        let earlyViewer = member(.viewer, 1)
        let lateEditor = member(.editor, 5)
        let earlyEditor = member(.editor, 3)
        #expect(ListPolicy.successor(among: [owner, earlyViewer, lateEditor, earlyEditor]) == earlyEditor)
        #expect(ListPolicy.successor(among: [owner, earlyViewer, member(.viewer, 9)]) == earlyViewer)
        #expect(ListPolicy.successor(among: [owner]) == nil)
    }
}

struct CalculationTests {
    private let food = UUID()
    private let salary = UUID()
    private let ana = UUID()
    private let ben = UUID()

    private func tx(_ type: TransactionType, _ amount: String, category: UUID, user: UUID) -> Transaction {
        Transaction(id: UUID(), type: type, amount: Decimal(string: amount)!, description: nil, reference: nil,
                    categoryId: category, transactionDate: CalendarDay(iso: "2026-11-01")!, listId: UUID(),
                    userId: user)
    }

    @Test func summaryTotalsByTypeAndCategory() {
        let summary = Calculations.summary(of: [
            tx(.expense, "10.10", category: food, user: ana),
            tx(.expense, "0.20", category: food, user: ana),
            tx(.income, "100", category: salary, user: ana),
        ])
        #expect(summary.count == 3)
        #expect(summary.totals.expense == Decimal(string: "10.30"))
        #expect(summary.totals.income == 100)
        #expect(summary.totals.balance == Decimal(string: "89.70"))
        #expect(summary.byCategory[food]?.expense == Decimal(string: "10.30"))
    }

    @Test func breakdownSplitsTotalsPerMember() {
        let breakdown = Calculations.breakdown(of: [
            tx(.expense, "30", category: food, user: ana),
            tx(.expense, "20", category: food, user: ben),
            tx(.income, "5", category: salary, user: ben),
        ])
        #expect(breakdown.totals.expense == 50)
        #expect(breakdown.byMember[ana] == MemberTotals(totals: TypeTotals(expense: 30), count: 1))
        #expect(breakdown.byMember[ben] == MemberTotals(totals: TypeTotals(expense: 20, income: 5), count: 2))
    }

    @Test func headlineFollowsTheSelectedFilter() {
        let summary = Calculations.summary(of: [tx(.expense, "40", category: food, user: ana), tx(.income, "25", category: salary, user: ana)])
        #expect(Headline.make(summary: summary, type: nil, categoryId: nil) == Headline(value: -15, tone: .neutral))
        #expect(Headline.make(summary: summary, type: .expense, categoryId: nil) == Headline(value: -40, tone: .expense))
        #expect(Headline.make(summary: summary, type: .income, categoryId: nil) == Headline(value: 25, tone: .income))
        #expect(Headline.make(summary: summary, type: nil, categoryId: salary) == Headline(value: 25, tone: .income))
        #expect(Headline.make(summary: summary, type: nil, categoryId: UUID()) == Headline(value: 0, tone: .expense))
    }

    @Test func stripListsEveryCategoryByAbsoluteValue() {
        let categories = [food, salary, UUID()].map {
            Category(id: $0, name: "", icon: "", color: "", description: nil, createdAt: .now)
        }
        let summary = Calculations.summary(of: [tx(.expense, "40", category: food, user: ana), tx(.income, "90", category: salary, user: ana)])
        let strip = CategoryTotal.strip(categories: categories, summary: summary, type: nil)
        #expect(strip.map(\.value) == [90, -40, 0])
    }
}
