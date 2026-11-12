import Foundation

public enum Calculations {
    public static func summary(of transactions: [Transaction]) -> TransactionSummary {
        var summary = TransactionSummary()
        for transaction in transactions {
            summary.count += 1
            summary.totals.add(transaction.type, transaction.amount)
            summary.byCategory[transaction.categoryId, default: TypeTotals()].add(transaction.type, transaction.amount)
        }
        return summary
    }

    public static func breakdown(of transactions: [Transaction]) -> ListBreakdown {
        var breakdown = ListBreakdown()
        for transaction in transactions {
            breakdown.totals.add(transaction.type, transaction.amount)
            breakdown.byCategory[transaction.categoryId, default: TypeTotals()].add(transaction.type, transaction.amount)
            breakdown.byMember[transaction.userId, default: MemberTotals()].totals.add(transaction.type, transaction.amount)
            breakdown.byMember[transaction.userId, default: MemberTotals()].count += 1
        }
        return breakdown
    }
}

/// What the home screen shows as its big number. Mirrors `home/lib/headline.ts`.
public struct Headline: Hashable, Sendable {
    public enum Tone: Sendable { case income, expense, neutral }

    public let value: Decimal
    public let tone: Tone

    public static func make(summary: TransactionSummary, type: TransactionType?, categoryId: UUID?) -> Headline {
        if let categoryId {
            let value = CategoryTotal.value(of: summary.byCategory[categoryId], type: type)
            return Headline(value: value, tone: value > 0 ? .income : .expense)
        }
        switch type {
        case .expense: return Headline(value: -summary.totals.expense, tone: .expense)
        case .income: return Headline(value: summary.totals.income, tone: .income)
        case nil:
            let balance = summary.totals.balance
            return Headline(value: balance, tone: balance < 0 ? .neutral : .income)
        }
    }
}

/// One bar of the home category strip. Mirrors `transaction/lib/strip-data.ts` (budgets not ported yet).
public struct CategoryTotal: Identifiable, Hashable, Sendable {
    public let category: Category
    public let value: Decimal
    /// The budget limit for this period, when the category has one in the selected list.
    public var budget: Decimal?

    public init(category: Category, value: Decimal, budget: Decimal? = nil) {
        self.category = category
        self.value = value
        self.budget = budget
    }

    /// Spent share of the budget (0...1), or nil without a budget.
    public var budgetRatio: Double? {
        guard let budget, budget > 0 else { return nil }
        return min(NSDecimalNumber(decimal: -value / budget).doubleValue, 1)
    }

    public var id: UUID { category.id }

    public static func value(of totals: TypeTotals?, type: TransactionType?) -> Decimal {
        guard let totals else { return 0 }
        switch type {
        case .expense: return -totals.expense
        case .income: return totals.income
        case nil: return totals.balance
        }
    }

    /// Every category, largest of |value| and budget first. A category with a budget (not in the income view)
    /// shows its spent amount in the budget period instead.
    public static func strip(
        categories: [Category], summary: TransactionSummary, type: TransactionType?, budgets: [UUID: BudgetProgress] = [:]
    ) -> [CategoryTotal] {
        categories
            .map { category -> CategoryTotal in
                if type != .income, let bar = budgets[category.id] {
                    return CategoryTotal(category: category, value: bar.spent > 0 ? -bar.spent : 0, budget: bar.limit)
                }
                return CategoryTotal(category: category, value: value(of: summary.byCategory[category.id], type: type))
            }
            .sorted { max(abs($0.value), $0.budget ?? 0) > max(abs($1.value), $1.budget ?? 0) }
    }
}
