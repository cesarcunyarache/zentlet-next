import Foundation
import SwiftData
import ZentletCore

/// CSV with the same columns as the web workbook's movements sheet (no spreadsheet library needed).
public struct LocalDataExportRepository: DataExportRepository {
    private let store: LocalStore
    private let session: LocalSession
    private let clock: @Sendable () -> Date

    public init(store: LocalStore, session: LocalSession, clock: @escaping @Sendable () -> Date = { .now }) {
        self.store = store
        self.session = session
        self.clock = clock
    }

    public func export(language: AppLanguage, currency: Currency) async throws -> ExportFile {
        let userId = try session.requireUserId()
        let today = CalendarDay(date: clock(), timeZone: .current)
        let spanish = language == .es
        return try await store.perform { context in
            let categories = try context.fetch(FetchDescriptor<CategoryEntity>(predicate: #Predicate { $0.userId == userId }))
            let names = Dictionary(uniqueKeysWithValues: categories.map { ($0.id, $0.name) })
            let transactions = try context.fetch(FetchDescriptor<TransactionEntity>(predicate: #Predicate { $0.userId == userId })).sortedForFeed()

            let header = spanish
                ? ["Fecha", "Tipo", "Categoría", "Descripción", "Monto (\(currency.symbol))", "Referencia"]
                : ["Date", "Type", "Category", "Description", "Amount (\(currency.symbol))", "Reference"]
            let rows = transactions.map { transaction -> [String] in
                let isIncome = transaction.type == TransactionType.income.rawValue
                return [
                    CalendarDay(key: transaction.dayKey)?.iso ?? "",
                    spanish ? (isIncome ? "Ingreso" : "Gasto") : (isIncome ? "Income" : "Expense"),
                    names[transaction.categoryId] ?? "",
                    transaction.details ?? "",
                    "\(Money.rounded(transaction.amount))",
                    transaction.reference ?? "",
                ]
            }
            let csv = ([header] + rows).map { $0.map(Self.escape).joined(separator: ",") }.joined(separator: "\r\n")
            return ExportFile(data: Data(("\u{FEFF}" + csv).utf8), fileName: "zentlet-\(today.iso).csv")
        }
    }

    /// RFC 4180 quoting; a leading formula character is neutralized so spreadsheets don't execute it.
    static func escape(_ field: String) -> String {
        var value = field
        if let first = value.first, "=+-@".contains(first) { value = "'" + value }
        guard value.contains(where: { $0 == "," || $0 == "\"" || $0 == "\n" || $0 == "\r" }) else { return value }
        return "\"" + value.replacingOccurrences(of: "\"", with: "\"\"") + "\""
    }
}
