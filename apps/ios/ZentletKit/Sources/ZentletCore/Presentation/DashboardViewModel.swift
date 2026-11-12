import Foundation
import Observation

/// Home: headline, category strip and recent movements for a period and list. Mirrors `useHomeSummary`.
@MainActor
@Observable
public final class DashboardViewModel {
    public var period: SummaryPeriod = .month
    public var type: TransactionType?
    public var categoryId: UUID?
    /// nil until lists load; then the private list by default.
    public var listId: UUID?

    public private(set) var lists: [ListMembership] = []
    public private(set) var categories: [Category] = []
    public private(set) var summary = TransactionSummary()
    public private(set) var recent: [Transaction] = []
    /// Budget progress per category for the selected list and period.
    public private(set) var budgetBars: [UUID: BudgetProgress] = [:]
    /// Movements ever recorded in the list; 0 shows the first-run empty state.
    public private(set) var allTimeCount = 0
    public private(set) var isLoading = false
    public var errorMessage: String?

    private let transactions: TransactionRepository
    private let categoryRepository: CategoryRepository
    private let listRepository: ListRepository
    private let budgetRepository: BudgetRepository?
    private let today: () -> CalendarDay
    private static let recentLimit = 20

    public init(
        transactions: TransactionRepository, categories: CategoryRepository, lists: ListRepository,
        budgets: BudgetRepository? = nil, today: @escaping () -> CalendarDay
    ) {
        budgetRepository = budgets
        self.transactions = transactions
        categoryRepository = categories
        listRepository = lists
        self.today = today
    }

    public var selectedList: TransactionList? { lists.first { $0.list.id == listId }?.list }
    public var currency: Currency { selectedList?.currency ?? .default }
    public var headline: Headline { Headline.make(summary: summary, type: type, categoryId: categoryId) }
    public var strip: [CategoryTotal] {
        CategoryTotal.strip(categories: categories, summary: summary, type: type, budgets: budgetBars)
    }
    public var range: DayRange { period.range(today: today()) }

    public func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            lists = try await listRepository.fetchMemberships()
            if listId == nil || selectedList == nil { listId = lists.first { $0.list.isPrivate }?.list.id }
            categories = try await categoryRepository.fetchAll()
            try await refresh()
        } catch is CancellationError {
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }

    public func refresh() async throws {
        let range = range
        let listId = listId
        let repository = transactions
        let query = TransactionQuery(range: range, listId: listId, type: type, categoryId: categoryId, limit: Self.recentLimit)
        async let periodSummary = repository.summary(range: range, listId: listId)
        async let lifetime = repository.summary(range: .allTime, listId: listId)
        async let page = repository.fetch(query)
        summary = try await periodSummary
        allTimeCount = try await lifetime.count
        recent = try await page.items
        if let budgetRepository {
            let inList = try await budgetRepository.fetchAll().filter { $0.listId == listId }
            let progress = try await BudgetMeasurer.progress(budgets: inList, view: range, today: today(), transactions: repository)
            budgetBars = Dictionary(
                inList.compactMap { budget in progress[budget.id].map { (budget.categoryId, $0) } },
                uniquingKeysWith: { first, _ in first }
            )
        }
    }

    public func select(categoryId: UUID?) async {
        self.categoryId = self.categoryId == categoryId ? nil : categoryId
        try? await refresh()
    }
}
