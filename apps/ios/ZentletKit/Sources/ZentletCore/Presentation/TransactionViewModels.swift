import Foundation
import Observation

public struct DayGroup: Identifiable, Hashable, Sendable {
    public let day: CalendarDay
    public let transactions: [Transaction]

    public var id: CalendarDay { day }
    public var total: Decimal { transactions.reduce(0) { $0 + $1.signedAmount } }

    /// Keeps feed order (newest first) and groups consecutive days.
    public static func group(_ transactions: [Transaction]) -> [DayGroup] {
        var groups: [DayGroup] = []
        for transaction in transactions {
            if let last = groups.last, last.day == transaction.transactionDate {
                groups[groups.count - 1] = DayGroup(day: last.day, transactions: last.transactions + [transaction])
            } else {
                groups.append(DayGroup(day: transaction.transactionDate, transactions: [transaction]))
            }
        }
        return groups
    }
}

/// The caller's feed with filters, search and pagination.
@MainActor
@Observable
public final class TransactionsViewModel {
    public private(set) var transactions: [Transaction] = []
    public private(set) var categories: [UUID: Category] = [:]
    public private(set) var isLoading = false
    public private(set) var hasMore = false
    public var errorMessage: String?

    public var type: TransactionType?
    public var categoryId: UUID?
    public var search = ""
    public var range: DayRange = .allTime

    private var nextCursor: String?
    private let transactionsRepository: TransactionRepository
    private let categoryRepository: CategoryRepository
    private static let pageSize = 50

    public init(transactions: TransactionRepository, categories: CategoryRepository) {
        transactionsRepository = transactions
        categoryRepository = categories
    }

    public var groups: [DayGroup] { DayGroup.group(transactions) }

    public func reload() async {
        isLoading = true
        defer { isLoading = false }
        do {
            categories = Dictionary(uniqueKeysWithValues: try await categoryRepository.fetchAll().map { ($0.id, $0) })
            let page = try await transactionsRepository.fetch(query(cursor: nil))
            try Task.checkCancellation()
            transactions = page.items
            nextCursor = page.nextCursor
            hasMore = page.nextCursor != nil
        } catch is CancellationError {
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }

    public func loadMore() async {
        guard let nextCursor, !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let page = try await transactionsRepository.fetch(query(cursor: nextCursor))
            transactions += page.items
            self.nextCursor = page.nextCursor
            hasMore = page.nextCursor != nil
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }

    public func delete(_ transaction: Transaction) async {
        do {
            try await transactionsRepository.delete(id: transaction.id)
            transactions.removeAll { $0.id == transaction.id }
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }

    private func query(cursor: String?) -> TransactionQuery {
        let search = search.trimmingCharacters(in: .whitespacesAndNewlines)
        return TransactionQuery(
            range: range, type: type, categoryId: categoryId,
            search: search.isEmpty ? nil : String(search.prefix(TransactionQuery.maxSearchLength)),
            cursor: cursor, limit: Self.pageSize
        )
    }
}

@MainActor
@Observable
public final class TransactionFormViewModel {
    public static let descriptionMaxLength = 42

    public var type: TransactionType
    public var amountText: String {
        didSet {
            let cleaned = Money.cleanInput(amountText)
            if cleaned != amountText { amountText = cleaned }
        }
    }
    public var categoryId: UUID?
    public var date: CalendarDay
    public var description: String
    public var reference: String
    /// nil = private list.
    public var listId: UUID?
    /// Only for new movements: repeats it and keeps it in the private list.
    public var recurrence: RecurrenceFrequency?
    /// The series an edited movement belongs to, if any.
    public private(set) var series: RecurringTransaction?

    public private(set) var categories: [Category] = []
    /// Lists the user may add entries to (owner or editor, matching currency).
    public private(set) var lists: [TransactionList] = []
    public private(set) var isSaving = false
    public var errorMessage: String?

    public let editing: Transaction?
    private let transactions: TransactionRepository
    private let categoryRepository: CategoryRepository
    private let listRepository: ListRepository
    private let recurringRepository: RecurringRepository?
    private let accountCurrency: Currency

    public init(
        transactions: TransactionRepository, categories: CategoryRepository, lists: ListRepository,
        accountCurrency: Currency, today: CalendarDay, editing: Transaction? = nil, defaultListId: UUID? = nil,
        recurring: RecurringRepository? = nil
    ) {
        recurringRepository = recurring
        self.transactions = transactions
        categoryRepository = categories
        listRepository = lists
        self.accountCurrency = accountCurrency
        self.editing = editing
        type = editing?.type ?? .expense
        amountText = editing.map { "\($0.amount)" } ?? ""
        categoryId = editing?.categoryId
        date = editing?.transactionDate ?? today
        description = editing?.description ?? ""
        reference = editing?.reference ?? ""
        listId = editing?.listId ?? defaultListId
    }

    public var amount: Decimal { Money.parse(amountText) }

    public var canSave: Bool {
        amount > 0 && categoryId != nil && description.count <= Self.descriptionMaxLength && !isSaving
    }

    public func load() async {
        do {
            categories = try await categoryRepository.fetchAll()
            if categoryId == nil { categoryId = categories.first?.id }
            lists = try await listRepository.fetchMemberships()
                .filter { ListPolicy.canContribute($0.role) && ListPolicy.acceptsCurrency(of: $0.list, accountCurrency: accountCurrency) }
                .map(\.list)
            if editing == nil, !lists.contains(where: { $0.id == listId }) {
                listId = lists.first { $0.isPrivate }?.id
            }
            if let seriesId = editing?.recurringTransactionId, let recurringRepository {
                series = try? await recurringRepository.fetch(id: seriesId)
            }
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }

    public func save() async -> Transaction? {
        guard let categoryId else { return nil }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        let draft = TransactionDraft(
            type: type, amount: amount, categoryId: categoryId, transactionDate: date,
            description: description, reference: reference
        )
        do {
            if let editing { return try await transactions.update(id: editing.id, draft) }
            return try await transactions.create(id: UUID(), draft, listId: recurrence == nil ? listId : nil, recurrence: recurrence)
        } catch {
            errorMessage = UserMessage.from(error)
            return nil
        }
    }

    /// Stops the series this movement came from; existing movements stay.
    public func stopSeries() async {
        guard let series, let recurringRepository else { return }
        do {
            try await recurringRepository.stop(id: series.id)
            self.series = nil
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }
}
