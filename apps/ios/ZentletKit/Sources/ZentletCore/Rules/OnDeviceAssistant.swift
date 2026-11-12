import Foundation

/// On-device stand-ins for the server AI. They use the same rules the web runs before calling the model
/// (description match, then everyday synonyms), so results are predictable and work offline.
public enum OnDeviceAssistant {
    public static func suggestCategory(description: String, categories: [Category], language: AppLanguage) -> CategorySuggestion? {
        let text = String(description.trimmingCharacters(in: .whitespacesAndNewlines).prefix(AILimits.maxDescriptionLength))
        guard text.count >= AILimits.minDescriptionLength, !categories.isEmpty else { return nil }
        let categoryId = DescriptionHints.matchCategory(text, categories: categories)
            ?? VoiceParser.matchBySynonym(text, categories: categories, language: language)
        let type = DescriptionHints.inferType(text) ?? .expense
        guard categoryId != nil || type == .income else { return nil }
        return CategorySuggestion(categoryId: categoryId, type: type)
    }

    /// Icon and color options for a category name, from a keyword table (es + en).
    public static func categoryStyles(for prompt: String) -> [CategoryStyle] {
        let clean = DescriptionHints.normalize(String(prompt.prefix(AILimits.maxPromptLength)))
        guard !clean.isEmpty else { return [] }
        let matches = styleTable.filter { entry in entry.stems.contains { clean.contains($0) } }.map(\.style)
        let fallback = [CategoryStyle(icon: "📦", color: "#94A3B8"), CategoryStyle(icon: "🏷️", color: "#60A5FA")]
        return Array((matches + fallback).prefix(4))
    }

    private static let styleTable: [(stems: [String], style: CategoryStyle)] = [
        (["comida", "aliment", "restaur", "almuerzo", "food", "meal", "lunch", "dinner"], CategoryStyle(icon: "🍔", color: "#FB923C")),
        (["cafe", "coffee"], CategoryStyle(icon: "☕️", color: "#A16207")),
        (["transport", "movilidad", "taxi", "uber", "bus", "travel"], CategoryStyle(icon: "🚕", color: "#FACC15")),
        (["auto", "carro", "gasolina", "combustible", "car", "fuel"], CategoryStyle(icon: "⛽️", color: "#F87171")),
        (["mercado", "super", "despensa", "grocer", "market"], CategoryStyle(icon: "🛒", color: "#4ADE80")),
        (["sueldo", "salario", "ingreso", "trabajo", "salary", "income", "work"], CategoryStyle(icon: "💼", color: "#2DD4BF")),
        (["hogar", "casa", "alquiler", "vivienda", "home", "house", "rent"], CategoryStyle(icon: "🏠", color: "#60A5FA")),
        (["servicio", "luz", "agua", "internet", "util", "bill"], CategoryStyle(icon: "💡", color: "#FACC15")),
        (["salud", "medic", "farmacia", "health", "pharma"], CategoryStyle(icon: "💊", color: "#F87171")),
        (["ocio", "entreten", "diversion", "salida", "fun", "entertain", "leisure"], CategoryStyle(icon: "🎬", color: "#A78BFA")),
        (["suscrip", "subscr", "netflix", "spotify"], CategoryStyle(icon: "📺", color: "#F472B6")),
        (["ropa", "cloth", "moda", "fashion"], CategoryStyle(icon: "👕", color: "#F472B6")),
        (["tecnolog", "tech", "celular", "phone"], CategoryStyle(icon: "💻", color: "#94A3B8")),
        (["regalo", "gift"], CategoryStyle(icon: "🎁", color: "#F87171")),
        (["gimnasio", "deporte", "gym", "sport", "fitness"], CategoryStyle(icon: "🏋️", color: "#4ADE80")),
        (["educa", "estudio", "curso", "study", "school", "course"], CategoryStyle(icon: "📚", color: "#60A5FA")),
        (["mascota", "pet", "perro", "gato"], CategoryStyle(icon: "🐾", color: "#FB923C")),
        (["viaje", "vacacion", "trip", "vacation"], CategoryStyle(icon: "✈️", color: "#2DD4BF")),
        (["ahorro", "inversion", "saving", "invest"], CategoryStyle(icon: "🐷", color: "#4ADE80")),
    ]
}

/// Turns the text recognized on a receipt photo into a draft. Looks for the total, the date, the merchant
/// (first text line) and a category by the same rules as the rest of the app.
public enum ReceiptTextParser {
    public static func parse(lines: [String], categories: [Category], language: AppLanguage, today: CalendarDay) throws -> ReceiptExtraction {
        let cleanLines = lines.map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        guard let amount = total(in: cleanLines) else { throw ReceiptScanError.notReceipt }

        let merchant = cleanLines.first { line in line.contains(where: \.isLetter) && amounts(in: line).isEmpty } ?? ""
        let description = String(merchant.prefix(VoiceParser.descriptionMaxLength))
        let allText = cleanLines.joined(separator: " ")
        let categoryId = DescriptionHints.matchCategory(description, categories: categories)
            ?? VoiceParser.matchBySynonym(allText, categories: categories, language: language)

        return ReceiptExtraction(
            amount: amount, currency: currency(in: allText), date: date(in: allText, today: today),
            summary: cleanLines.prefix(3).joined(separator: " · "), description: description,
            categoryId: categoryId, type: .expense
        )
    }

    private static let totalWords = ["total", "importe", "a pagar", "monto", "amount due", "grand total"]

    /// The amount on the last line that mentions a total; otherwise the largest amount.
    static func total(in lines: [String]) -> Decimal? {
        let totalLines = lines.filter { line in
            let folded = DescriptionHints.fold(line)
            return totalWords.contains { folded.contains($0) } && !folded.contains("subtotal")
        }
        if let line = totalLines.last(where: { !amounts(in: $0).isEmpty }) { return amounts(in: line).last }
        return lines.flatMap(amounts(in:)).max()
    }

    /// Amounts with two decimals ("1,234.50", "45.90", "45,90").
    static func amounts(in line: String) -> [Decimal] {
        let pattern = try! NSRegularExpression(pattern: #"(?<![\d.,])(\d{1,3}(?:[.,]\d{3})*|\d+)[.,](\d{2})(?![\d])"#)
        return pattern.matches(in: line).compactMap { match in
            guard let integer = match.group(1), let cents = match.group(2) else { return nil }
            let digits = integer.filter(\.isNumber)
            guard let value = Decimal(string: "\(digits).\(cents)", locale: Locale(identifier: "en_US_POSIX")), value > 0,
                  value <= Money.maxAmount else { return nil }
            return value
        }
    }

    static func currency(in text: String) -> String? {
        let folded = DescriptionHints.fold(text)
        if folded.contains("s/") || folded.contains("soles") { return "PEN" }
        if folded.contains("us$") || folded.contains("usd") || folded.contains("dolar") { return "USD" }
        if folded.contains("€") || folded.contains("eur") { return "EUR" }
        if folded.contains("cop") { return "COP" }
        return nil
    }

    /// dd/mm/yyyy, dd-mm-yy or yyyy-mm-dd; never later than today.
    static func date(in text: String, today: CalendarDay) -> CalendarDay? {
        let dayFirst = try! NSRegularExpression(pattern: #"\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b"#)
        let yearFirst = try! NSRegularExpression(pattern: #"\b(\d{4})-(\d{2})-(\d{2})\b"#)
        if let match = yearFirst.matches(in: text).first, let day = CalendarDay(iso: match.group(0)!), day <= today { return day }
        for match in dayFirst.matches(in: text) {
            guard let d = Int(match.group(1)!), let m = Int(match.group(2)!), var y = Int(match.group(3)!) else { continue }
            if y < 100 { y += 2000 }
            if let day = CalendarDay(year: y, month: m, day: d), day <= today { return day }
        }
        return nil
    }
}
