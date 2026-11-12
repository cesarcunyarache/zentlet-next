import Foundation

/// Rule-based hints from a description. Port of `transaction/lib/parse-description.ts`.
public enum DescriptionHints {
    static let incomeWords = [
        "salario", "sueldo", "nomina", "quincena", "ingreso", "cobro", "cobre", "venta", "vendi", "reembolso",
        "devolucion", "me pagaron", "me depositaron", "bono", "aguinaldo", "gratificacion", "freelance", "salary",
        "paycheck", "payroll", "income", "refund", "reimbursement", "bonus", "got paid",
    ]

    private static let minWordLength = 3
    private static let stemLength = 4

    /// Lowercase without accents ("Ñandú" → "nandu"), like `fold` on the web.
    public static func fold(_ text: String) -> String {
        text.lowercased().folding(options: .diacriticInsensitive, locale: nil)
    }

    public static func normalize(_ text: String) -> String {
        fold(text).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    public static func inferType(_ text: String) -> TransactionType? {
        let clean = normalize(text)
        return incomeWords.contains { clean.contains($0) } ? .income : nil
    }

    /// The category whose name best matches a word of the text: exact name 3 points, shared stem 2.
    public static func matchCategory(_ text: String, categories: [Category]) -> UUID? {
        let words = significantWords(normalize(text))
        guard !words.isEmpty else { return nil }

        var best: (id: UUID, score: Int)?
        for category in categories {
            let name = normalize(category.name)
            let nameWords = significantWords(name)
            let score = words.map { word -> Int in
                if name == word { return 3 }
                let partial = nameWords.contains { $0.hasPrefix(word) || word.hasPrefix(String($0.prefix(stemLength))) }
                return partial ? 2 : 0
            }.max() ?? 0
            if score > (best?.score ?? 0) { best = (category.id, score) }
        }
        return best?.id
    }

    private static func significantWords(_ normalized: String) -> [String] {
        normalized
            .split { !($0.isASCII && ($0.isLetter || $0.isNumber)) && $0 != "ñ" }
            .map(String.init)
            .filter { $0.count >= minWordLength }
    }
}
