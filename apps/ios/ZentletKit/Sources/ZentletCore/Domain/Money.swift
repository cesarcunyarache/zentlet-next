import Foundation

public enum Currency: String, CaseIterable, Codable, Sendable {
    case pen = "PEN"
    case usd = "USD"
    case eur = "EUR"
    case cop = "COP"

    public static let `default` = Currency.pen

    public var symbol: String {
        switch self {
        case .pen: "S/"
        case .usd: "$"
        case .eur: "€"
        case .cop: "$COP"
        }
    }
}

/// Amounts are `Decimal` with two fractional digits, mirroring Postgres `Decimal(12,2)` on the web.
public enum Money {
    public static let maxAmount: Decimal = 9_999_999_999
    public static let maxIntegerDigits = 9
    public static let maxFractionDigits = 2

    public static func rounded(_ value: Decimal) -> Decimal {
        var input = value
        var result = Decimal()
        NSDecimalRound(&result, &input, maxFractionDigits, .plain)
        return result
    }

    public static func isWhole(_ value: Decimal) -> Bool {
        var input = value
        var result = Decimal()
        NSDecimalRound(&result, &input, 0, .plain)
        return result == value
    }

    public static func hasAtMostTwoDecimals(_ value: Decimal) -> Bool {
        rounded(value) == value
    }

    /// "1,234.56" — always two decimals, magnitude only (es-PE grouping, as on the web).
    public static func formatNumber(_ value: Decimal) -> String {
        abs(value).formatted(
            .number.precision(.fractionLength(maxFractionDigits)).grouping(.automatic).locale(displayLocale)
        )
    }

    /// "S/ 1,234.56"
    public static func format(_ value: Decimal, currency: Currency) -> String {
        "\(currency.symbol) \(formatNumber(value))"
    }

    /// "+ S/ 10.00" or "− S/ 10.00"
    public static func formatSigned(_ value: Decimal, currency: Currency) -> String {
        "\(value < 0 ? "−" : "+") \(format(value, currency: currency))"
    }

    /// "950", "1.2k", "35k", "1.5M"
    public static func formatShort(_ value: Decimal) -> String {
        let magnitude = abs(NSDecimalNumber(decimal: value).doubleValue)
        if magnitude.rounded() < 1000 { return String(Int(magnitude.rounded())) }

        let units: [(size: Double, suffix: String)] = [(1e3, "k"), (1e6, "M"), (1e9, "B")]
        for (index, unit) in units.enumerated() {
            let scaled = magnitude / unit.size
            let digits = scaled < 100 ? 1 : 0
            let factor = pow(10, Double(digits))
            let rounded = (scaled * factor).rounded() / factor
            if rounded < 1000 || index == units.count - 1 {
                return rounded == rounded.rounded() ? "\(Int(rounded))\(unit.suffix)" : "\(rounded)\(unit.suffix)"
            }
        }
        return String(magnitude)
    }

    /// Keeps digits and a single decimal separator (comma accepted), at most 9 integer digits and 2 decimals.
    public static func cleanInput(_ raw: String) -> String {
        let allowed = raw.filter { $0.isASCII && ($0.isNumber || $0 == "." || $0 == ",") }
            .replacingOccurrences(of: ",", with: ".")
        let parts = allowed.split(separator: ".", omittingEmptySubsequences: false)
        var integer = String(parts.first ?? "")
        let fraction: String? = parts.count > 1 ? String(parts.dropFirst().joined().prefix(maxFractionDigits)) : nil

        while integer.count > 1, integer.hasPrefix("0") { integer.removeFirst() }
        if integer.count > maxIntegerDigits { integer = String(integer.prefix(maxIntegerDigits)) }
        return fraction.map { "\(integer).\($0)" } ?? integer
    }

    /// Parses a cleaned input ("12.5") into a Decimal rounded to cents. Empty or invalid returns 0.
    public static func parse(_ input: String) -> Decimal {
        guard let value = Decimal(string: input, locale: Locale(identifier: "en_US_POSIX")) else { return 0 }
        return rounded(value)
    }

    private static let displayLocale = Locale(identifier: "es_PE")
}
