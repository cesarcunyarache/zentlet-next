import Foundation
import Testing
import ZentletCore
@testable import ZentletData

struct LocalCategoryTests {
    @Test func crudKeepsNewestFirstAndIsOwnerScoped() async throws {
        let device = try LocalHarness()
        try await device.signUp("Ana")
        let food = try await device.category("Food")
        let rent = try await device.category("Rent")
        #expect(try await device.categories.fetchAll().map(\.name) == ["Rent", "Food"])

        let renamed = try await device.categories.update(id: food.id, CategoryDraft(name: "Groceries", icon: "🛒", color: "#111"))
        #expect(renamed.name == "Groceries")
        try await device.categories.delete(id: rent.id)
        #expect(try await device.categories.fetchAll().map(\.name) == ["Groceries"])

        try await device.signUp("Ben")
        #expect(try await device.categories.fetchAll().isEmpty)
        await #expect(throws: AppError.notFound) { try await device.categories.delete(id: food.id) }
    }

    @Test func createIsIdempotentAndIdsCantBeStolen() async throws {
        let device = try LocalHarness()
        try await device.signUp("Ana")
        let id = UUID()
        let draft = CategoryDraft(name: "Food", icon: "x", color: "c")
        _ = try await device.categories.create(id: id, draft)
        _ = try await device.categories.create(id: id, draft)
        #expect(try await device.categories.fetchAll().count == 1)

        try await device.signUp("Ben")
        await #expect(throws: AppError.conflict(ErrorCode.idTaken)) { try await device.categories.create(id: id, draft) }
    }

    @Test func cannotDeleteACategoryWithTransactions() async throws {
        let device = try LocalHarness()
        try await device.signUp("Ana")
        let food = try await device.category()
        _ = try await device.expense(5, category: food.id)
        await #expect(throws: AppError.conflict(ErrorCode.hasTransactions)) { try await device.categories.delete(id: food.id) }
    }

    @Test func stopsAtTwoHundredCategories() async throws {
        let device = try LocalHarness()
        try await device.signUp("Ana")
        for index in 0..<CategoryDraft.maxCategoriesPerUser { _ = try await device.category("C\(index)") }
        await #expect(throws: AppError.validation(ErrorCode.limitReached)) { try await device.category("One more") }
    }
}

struct LocalTransactionTests {
    @Test func feedFiltersByRangeTypeCategoryAndSearch() async throws {
        let device = try LocalHarness()
        try await device.signUp("Ana")
        let food = try await device.category("Food")
        let salary = try await device.category("Salary")
        let lunch = try await device.transactions.create(
            id: UUID(), TransactionDraft(type: .expense, amount: 20, categoryId: food.id, transactionDate: CalendarDay(iso: "2027-01-05")!, description: "Lunch"),
            listId: nil
        )
        let pay = try await device.transactions.create(
            id: UUID(), TransactionDraft(type: .income, amount: 1000, categoryId: salary.id, transactionDate: CalendarDay(iso: "2027-01-31")!),
            listId: nil
        )
        _ = try await device.expense(7, category: food.id, day: "2027-02-01")

        let january = DayRange(from: CalendarDay(iso: "2027-01-01"), to: CalendarDay(iso: "2027-02-01"))
        #expect(try await device.transactions.fetch(TransactionQuery(range: january)).items.map(\.id) == [pay.id, lunch.id])
        #expect(try await device.transactions.fetch(TransactionQuery(type: .income)).items.map(\.id) == [pay.id])
        #expect(try await device.transactions.fetch(TransactionQuery(search: "LUN")).items.map(\.id) == [lunch.id])
        #expect(try await device.transactions.fetch(TransactionQuery(search: "sala")).items.map(\.id) == [pay.id])
        #expect(try await device.transactions.fetch(TransactionQuery(categoryId: food.id)).items.count == 2)

        let summary = try await device.transactions.summary(range: january, listId: nil)
        #expect(summary.count == 2)
        #expect(summary.totals == TypeTotals(expense: 20, income: 1000))
    }

    @Test func paginatesWithCursor() async throws {
        let device = try LocalHarness()
        try await device.signUp("Ana")
        let food = try await device.category()
        for day in 1...5 { _ = try await device.expense(1, category: food.id, day: String(format: "2027-01-%02d", day)) }

        let first = try await device.transactions.fetch(TransactionQuery(limit: 2))
        let second = try await device.transactions.fetch(TransactionQuery(cursor: first.nextCursor, limit: 2))
        let third = try await device.transactions.fetch(TransactionQuery(cursor: second.nextCursor, limit: 2))
        #expect(first.items.map(\.transactionDate.day) == [5, 4])
        #expect(second.items.map(\.transactionDate.day) == [3, 2])
        #expect(third.items.map(\.transactionDate.day) == [1])
        #expect(third.nextCursor == nil)
    }

    @Test func requiresAnOwnCategory() async throws {
        let device = try LocalHarness()
        try await device.signUp("Ana")
        let anaFood = try await device.category()
        try await device.signUp("Ben")
        await #expect(throws: AppError.validation(ErrorCode.categoryNotFound)) { try await device.expense(1, category: anaFood.id) }
    }

    @Test func onlyTheAuthorCanEditOrDelete() async throws {
        let device = try LocalHarness()
        try await device.signUp("Ana")
        let food = try await device.category()
        let lunch = try await device.expense(10, category: food.id)

        let edited = try await device.transactions.update(
            id: lunch.id, TransactionDraft(type: .income, amount: 11, categoryId: food.id, transactionDate: CalendarDay(iso: "2027-01-11")!)
        )
        #expect(edited.amount == 11)
        #expect(edited.type == .income)
        #expect(edited.listId == lunch.listId)

        try await device.signUp("Ben")
        await #expect(throws: AppError.notFound) { try await device.transactions.delete(id: lunch.id) }
        #expect(try await device.transactions.fetch(id: lunch.id) == nil)

        try await device.signIn("Ana")
        try await device.transactions.delete(id: lunch.id)
        #expect(try await device.transactions.fetch(id: lunch.id) == nil)
    }
}
