import Foundation

/// What a spoken sentence becomes ("ayer gasté 35 en almuerzo" → expense 35, yesterday, "Almuerzo", Food).
public struct VoiceDraft: Hashable, Sendable {
    public let type: TransactionType
    public let amount: Decimal?
    public let description: String
    public let categoryId: UUID?
    public let transactionDate: CalendarDay
}

/// Port of `transaction/lib/parse-voice.ts` and `lib/voice/*`: rules only, no AI, runs on the device.
public enum VoiceParser {
    public static func parse(_ transcript: String, categories: [Category], language: AppLanguage, today: CalendarDay) -> VoiceDraft {
        let lang = VoiceLanguage.for(language)
        let text = transcript.trimmingCharacters(in: .whitespacesAndNewlines)
        let date = findDate(text, lang: lang, today: today)
        let amount = findAmount(date.map { stripSpan(text, $0.match) } ?? text, lang: lang)
        let description = buildDescription(text, lang: lang, amountMatch: amount?.match ?? "", dateMatch: date?.match ?? "")

        return VoiceDraft(
            type: inferType(text, lang: lang),
            amount: amount?.value,
            description: description,
            categoryId: DescriptionHints.matchCategory(description, categories: categories)
                ?? matchBySynonym(text, categories: categories, lang: lang),
            transactionDate: date?.day ?? today
        )
    }

    /// A category found through everyday words ("uber" → a category named like "Transporte").
    public static func matchBySynonym(_ text: String, categories: [Category], language: AppLanguage) -> UUID? {
        matchBySynonym(text, categories: categories, lang: .for(language))
    }

    static func matchBySynonym(_ text: String, categories: [Category], lang: VoiceLanguage) -> UUID? {
        let clean = " \(DescriptionHints.normalize(text)) "
        let names = categories.map { ($0.id, DescriptionHints.normalize($0.name)) }
        for synonym in lang.synonyms where synonym.words.contains(where: { clean.contains(" \($0) ") }) {
            if let match = names.first(where: { name in synonym.categoryStems.contains { name.1.contains($0) } }) {
                return match.0
            }
        }
        return nil
    }

    private static func inferType(_ text: String, lang: VoiceLanguage) -> TransactionType {
        let clean = DescriptionHints.normalize(text)
        let isIncome = DescriptionHints.inferType(clean) == .income || lang.incomeVerbs.contains { clean.contains($0) }
        return isIncome ? .income : .expense
    }

    // MARK: - Amount

    struct SpokenAmount {
        let value: Decimal
        let match: String
    }

    static func findAmount(_ text: String, lang: VoiceLanguage) -> SpokenAmount? {
        let candidates = lang.amount.matches(in: text).compactMap { match -> (SpokenAmount, Bool)? in
            guard let raw = match.group(1) else { return nil }
            var value = parseNumberToken(raw)
            if let cents = match.group(2) {
                value += (Decimal(string: cents.padding(toLength: 2, withPad: "0", startingAt: 0)) ?? 0) / 100
            }
            let multiplier = match.group(3)
            if let multiplier { value *= lang.multipliers[DescriptionHints.normalize(multiplier)] ?? 1 }
            guard value > 0 else { return nil }
            let whole = match.group(0)!.trimmingCharacters(in: .whitespaces)
            let hasCurrency = match.group(4) != nil || multiplier != nil || whole.hasPrefix("$")
            return (SpokenAmount(value: value, match: whole), hasCurrency)
        }
        guard !candidates.isEmpty else { return findNumberWordAmount(text, lang: lang) }
        let best = candidates.first { $0.1 }?.0 ?? candidates.last!.0
        return SpokenAmount(value: Money.rounded(best.value), match: best.match)
    }

    private static func parseNumberToken(_ token: String) -> Decimal {
        let grouped = try! NSRegularExpression(pattern: #"^\d{1,3}(?:[ .,]\d{3})+$"#)
        if grouped.firstMatch(in: token, range: NSRange(token.startIndex..., in: token)) != nil {
            return Decimal(string: token.filter(\.isNumber)) ?? 0
        }
        return Decimal(string: token.replacingOccurrences(of: ",", with: "."), locale: Locale(identifier: "en_US_POSIX")) ?? 0
    }

    private static func findNumberWordAmount(_ text: String, lang: VoiceLanguage) -> SpokenAmount? {
        guard let match = lang.numberWordAmount.matches(in: text).first, let word = match.group(1),
              let value = lang.numberWords[DescriptionHints.normalize(word)] else { return nil }
        return SpokenAmount(value: Decimal(value), match: match.group(0)!)
    }

    // MARK: - Date

    struct SpokenDate {
        let day: CalendarDay
        let match: String
    }

    static func findDate(_ text: String, lang: VoiceLanguage, today: CalendarDay) -> SpokenDate? {
        let clean = DescriptionHints.normalize(text)
        return findExactDate(clean, lang: lang, today: today)
            ?? findRelativeDate(clean, lang: lang, today: today)
            ?? findWeekday(clean, lang: lang, today: today)
    }

    private static func findExactDate(_ clean: String, lang: VoiceLanguage, today: CalendarDay) -> SpokenDate? {
        guard let match = lang.exactDate.matches(in: clean).first else { return nil }
        let dayText = match.group(1) ?? match.group(4)
        let monthName = match.group(2) ?? match.group(3)
        guard let dayText, let day = Int(dayText), let monthName else { return nil }
        let month = lang.months.firstIndex(of: monthName == "setiembre" ? "septiembre" : monthName)
        guard let month, (1...31).contains(day) else { return nil }
        guard var date = CalendarDay(year: today.year, month: month + 1, day: day) else { return nil }
        if date > today {
            guard let lastYear = CalendarDay(year: today.year - 1, month: month + 1, day: day) else { return nil }
            date = lastYear
        }
        return SpokenDate(day: date, match: match.group(0)!)
    }

    private static func findRelativeDate(_ clean: String, lang: VoiceLanguage, today: CalendarDay) -> SpokenDate? {
        guard let relative = lang.relativeDates.first(where: { !$0.pattern.matches(in: clean).isEmpty }) else { return nil }
        return SpokenDate(day: today.addingDays(-relative.daysAgo), match: relative.match)
    }

    private static func findWeekday(_ clean: String, lang: VoiceLanguage, today: CalendarDay) -> SpokenDate? {
        guard let match = lang.weekday.matches(in: clean).first, let name = match.group(1),
              let target = lang.days.firstIndex(of: name) else { return nil }
        let todayIndex = Calendar.utcGregorian.component(.weekday, from: today.date) - 1 // 0 = Sunday
        let daysAgo = (todayIndex - target + 7) % 7
        return SpokenDate(day: today.addingDays(-(daysAgo == 0 ? 7 : daysAgo)), match: match.group(0)!)
    }

    // MARK: - Description

    static let descriptionMaxLength = 42

    static func stripSpan(_ text: String, _ span: String) -> String {
        guard !span.isEmpty, let range = DescriptionHints.fold(text).range(of: DescriptionHints.fold(span)) else { return text }
        let offset = DescriptionHints.fold(text).distance(from: DescriptionHints.fold(text).startIndex, to: range.lowerBound)
        let start = text.index(text.startIndex, offsetBy: offset, limitedBy: text.endIndex) ?? text.endIndex
        let end = text.index(start, offsetBy: span.count, limitedBy: text.endIndex) ?? text.endIndex
        return String(text[..<start]) + " " + String(text[end...])
    }

    static func buildDescription(_ text: String, lang: VoiceLanguage, amountMatch: String, dateMatch: String) -> String {
        var rest = stripSpan(stripSpan(text, amountMatch), dateMatch)
        rest = lang.leadingVerbs.replacingAll(in: rest, with: " ")
        rest = lang.currencyWord.replacingAll(in: rest, with: " ")
        rest = Patterns.punctuation.replacingAll(in: rest, with: " ")
        rest = Patterns.whitespace.replacingAll(in: rest, with: " ").trimmingCharacters(in: .whitespaces)

        rest = stripRepeatedly(stripRepeatedly(rest, lang.connectors), lang.trailingConnectors)
        let trimmed = String(rest.prefix(descriptionMaxLength)).trimmingCharacters(in: .whitespaces)
        return trimmed.prefix(1).uppercased() + trimmed.dropFirst()
    }

    private static func stripRepeatedly(_ text: String, _ pattern: NSRegularExpression) -> String {
        var rest = text
        while !pattern.matches(in: rest).isEmpty { rest = pattern.replacingFirst(in: rest, with: "") }
        return rest
    }

    private enum Patterns {
        static let punctuation = try! NSRegularExpression(pattern: #"[.,;:!?¿¡$]"#)
        static let whitespace = try! NSRegularExpression(pattern: #"\s+"#)
    }
}

// MARK: - Languages

struct VoiceLanguage: @unchecked Sendable {
    struct RelativeDate {
        let pattern: NSRegularExpression
        let daysAgo: Int
        let match: String
    }

    struct Synonym {
        let words: [String]
        let categoryStems: [String]
    }

    let multipliers: [String: Decimal]
    let numberWords: [String: Int]
    let months: [String]
    let days: [String]
    let relativeDates: [RelativeDate]
    let exactDate: NSRegularExpression
    let weekday: NSRegularExpression
    let incomeVerbs: [String]
    let leadingVerbs: NSRegularExpression
    let connectors: NSRegularExpression
    let trailingConnectors: NSRegularExpression
    let synonyms: [Synonym]
    let amount: NSRegularExpression
    let numberWordAmount: NSRegularExpression
    let currencyWord: NSRegularExpression

    static func `for`(_ language: AppLanguage) -> VoiceLanguage { language == .en ? english : spanish }

    private static let wordStart = #"(?<![\p{L}\d])"#
    private static let wordEnd = #"(?![\p{L}\d])"#
    private static let spokenNumber = #"\$?(\d{1,3}(?:[ .,]\d{3})+|\d+(?:[.,]\d{1,2})?)"#

    private static func regex(_ pattern: String, caseInsensitive: Bool = false) -> NSRegularExpression {
        try! NSRegularExpression(pattern: pattern, options: caseInsensitive ? [.caseInsensitive] : [])
    }

    private static func wordList(_ list: String) -> NSRegularExpression {
        regex("\(wordStart)(?:\(list))\(wordEnd)", caseInsensitive: true)
    }

    private init(
        currency: String, multiplier: String, multipliers: [String: Decimal], numberWords: [String: Int], cents: String,
        months: [String], days: [String], relativeDates: [RelativeDate], exactDate: NSRegularExpression,
        incomeVerbs: [String], leadingVerbs: NSRegularExpression, connectors: NSRegularExpression,
        trailingConnectors: NSRegularExpression, synonyms: [Synonym], weekdayPrefix: String, weekdaySuffix: String
    ) {
        self.multipliers = multipliers
        self.numberWords = numberWords
        self.months = months
        self.days = days
        self.relativeDates = relativeDates
        self.exactDate = exactDate
        weekday = Self.regex(#"\b"# + weekdayPrefix + "(\(days.joined(separator: "|")))" + weekdaySuffix + #"\b"#)
        self.incomeVerbs = incomeVerbs
        self.leadingVerbs = leadingVerbs
        self.connectors = connectors
        self.trailingConnectors = trailingConnectors
        self.synonyms = synonyms
        amount = Self.regex(
            "\(Self.spokenNumber)(?:\(cents))?\\s*(?:(\(multiplier)|lucas?)\(Self.wordEnd))?\\s*(\(currency))?", caseInsensitive: true
        )
        numberWordAmount = Self.regex(#"\b("# + numberWords.keys.sorted().joined(separator: "|") + #")\s+("# + currency + ")", caseInsensitive: true)
        currencyWord = Self.regex("\(Self.wordStart)\(currency)\(Self.wordEnd)", caseInsensitive: true)
    }

    static let spanish = VoiceLanguage(
        currency: #"(?:soles?|s\/\.?|d[oó]lares?|usd|euros?|pesos?|lucas?)"#,
        multiplier: #"(?:millones?|mill[oó]n|mil)"#,
        multipliers: ["mil": 1_000, "lucas": 1_000, "luca": 1_000, "millon": 1_000_000, "millones": 1_000_000],
        numberWords: [
            "un": 1, "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8,
            "nueve": 9, "diez": 10, "once": 11, "doce": 12, "quince": 15, "veinte": 20, "treinta": 30, "cuarenta": 40,
            "cincuenta": 50, "sesenta": 60, "setenta": 70, "ochenta": 80, "noventa": 90, "cien": 100, "mil": 1000,
        ],
        cents: #"\s+con\s+(\d{1,2})"#,
        months: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
        days: ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"],
        relativeDates: [
            RelativeDate(pattern: regex(#"\b(?:anteayer|antes de ayer)\b"#), daysAgo: 2, match: ""),
            RelativeDate(pattern: regex(#"\bayer\b"#), daysAgo: 1, match: ""),
        ],
        exactDate: regex(#"\b(?:el\s+)?(\d{1,2})\s+de\s+([a-z]+)\b"#),
        incomeVerbs: ["recibi", "gane", "me transfirieron", "me yapearon", "me plinearon"],
        leadingVerbs: wordList(
            "hoy|ayer|anteayer|antes de ayer|me pagaron|me depositaron|me transfirieron|me yapearon|me plinearon|gast[eé]|pagu[eé]|compr[eé]|cobr[eé]|recib[ií]|gan[eé]|invert[ií]|di|puse|registra|anota|agrega"
        ),
        connectors: regex(#"^(?:en|de|del|por|para|un|una|unos|unas|el|la|los|las|mi|mis|y|a|al|con|total)\b\s*"#, caseInsensitive: true),
        trailingConnectors: regex(#"\s*\b(?:en|de|del|por|para|a|al|con|y)$"#, caseInsensitive: true),
        synonyms: [
            Synonym(
                words: ["almuerzo", "cena", "desayuno", "comida", "restaurante", "menu", "pollo", "pizza", "hamburguesa", "chifa", "ceviche", "lonche", "pan", "panaderia"],
                categoryStems: ["comida", "aliment", "restaur", "comer", "almuerzo"]
            ),
            Synonym(words: ["cafe", "starbucks"], categoryStems: ["cafe", "comida", "aliment"]),
            Synonym(
                words: ["taxi", "uber", "cabify", "didi", "bus", "micro", "combi", "pasaje", "metro", "gasolina", "combustible", "grifo", "peaje", "estacionamiento"],
                categoryStems: ["transport", "movilidad", "auto", "carro", "gasolina", "combustible"]
            ),
            Synonym(
                words: ["mercado", "supermercado", "super", "plaza vea", "tottus", "wong", "metro", "bodega", "viveres"],
                categoryStems: ["mercado", "super", "compras", "aliment", "despensa"]
            ),
            Synonym(words: ["sueldo", "salario", "quincena", "nomina", "planilla"], categoryStems: ["sueldo", "salario", "ingreso", "trabajo", "nomina"]),
            Synonym(words: ["alquiler", "renta", "luz", "agua", "internet", "gas", "cable"], categoryStems: ["hogar", "casa", "alquiler", "servicio", "vivienda"]),
            Synonym(words: ["farmacia", "medicina", "doctor", "clinica", "consulta", "pastillas"], categoryStems: ["salud", "medic", "farmacia"]),
            Synonym(words: ["cine", "netflix", "spotify", "juego", "concierto", "fiesta", "bar", "cerveza"], categoryStems: ["ocio", "entreten", "diversion", "salida", "suscrip"]),
            Synonym(words: ["mouse", "laptop", "celular", "audifonos", "teclado", "ropa", "zapatillas", "polo", "regalo"], categoryStems: ["compra", "tecnolog", "ropa", "regalo", "shopping"]),
            Synonym(words: ["gimnasio", "gym"], categoryStems: ["gimnasio", "deporte", "salud"]),
            Synonym(words: ["curso", "libro", "universidad", "colegio", "matricula"], categoryStems: ["educa", "estudio", "curso"]),
        ],
        weekdayPrefix: #"(?:el\s+)?"#, weekdaySuffix: #"(?:\s+pasado)?"#
    )

    static let english = VoiceLanguage(
        currency: #"(?:dollars?|bucks?|usd|euros?|soles?|pesos?)"#,
        multiplier: #"(?:thousand|grand|millions?)"#,
        multipliers: ["thousand": 1_000, "grand": 1_000, "million": 1_000_000, "millions": 1_000_000],
        numberWords: [
            "a": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
            "eleven": 11, "twelve": 12, "fifteen": 15, "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60,
            "seventy": 70, "eighty": 80, "ninety": 90, "hundred": 100,
        ],
        cents: #"\s+and\s+(\d{1,2})(?:\s+cents?)?"#,
        months: ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
        days: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        relativeDates: [
            RelativeDate(pattern: regex(#"\bday before yesterday\b"#), daysAgo: 2, match: "day before yesterday"),
            RelativeDate(pattern: regex(#"\byesterday\b"#), daysAgo: 1, match: ""),
        ],
        exactDate: regex(#"\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+of\s+([a-z]+)\b|\b(?:on\s+)?([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b"#),
        incomeVerbs: ["got paid", "received", "earned", "paid me", "sold", "refund"],
        leadingVerbs: wordList("today|yesterday|got paid|spent|paid|bought|received|earned|got|add|record|log|put"),
        connectors: regex(#"^(?:i|we|on|for|at|in|of|the|a|an|my|to|from|and|with|total)\b\s*"#, caseInsensitive: true),
        trailingConnectors: regex(#"\s*\b(?:on|for|at|in|of|to|from|and|with)$"#, caseInsensitive: true),
        synonyms: [
            Synonym(
                words: ["lunch", "dinner", "breakfast", "food", "restaurant", "meal", "pizza", "burger", "sandwich", "takeout", "bakery"],
                categoryStems: ["food", "restaur", "meal", "eat", "dining", "comida", "aliment", "almuerzo"]
            ),
            Synonym(words: ["coffee", "starbucks", "cafe"], categoryStems: ["coffee", "cafe", "food", "comida"]),
            Synonym(
                words: ["taxi", "uber", "lyft", "cab", "bus", "subway", "metro", "train", "gas", "fuel", "parking", "toll"],
                categoryStems: ["transport", "travel", "car", "fuel", "movilidad", "auto", "gasolina"]
            ),
            Synonym(
                words: ["groceries", "grocery", "supermarket", "market", "walmart", "costco"],
                categoryStems: ["grocer", "market", "shopping", "mercado", "super", "compras"]
            ),
            Synonym(words: ["salary", "paycheck", "payroll", "wage", "wages"], categoryStems: ["salary", "income", "work", "job", "sueldo", "salario", "ingreso"]),
            Synonym(words: ["rent", "electricity", "water", "internet", "utilities", "phone"], categoryStems: ["home", "house", "rent", "util", "bill", "hogar", "casa", "servicio"]),
            Synonym(words: ["pharmacy", "medicine", "doctor", "clinic", "pills"], categoryStems: ["health", "medic", "pharma", "salud", "farmacia"]),
            Synonym(words: ["movie", "movies", "cinema", "netflix", "spotify", "game", "concert", "party", "bar", "beer"], categoryStems: ["entertain", "fun", "leisure", "subscr", "ocio", "entreten", "suscrip"]),
            Synonym(words: ["laptop", "phone", "headphones", "keyboard", "mouse", "clothes", "shoes", "gift"], categoryStems: ["shopping", "tech", "cloth", "gift", "compra", "tecnolog", "ropa", "regalo"]),
            Synonym(words: ["gym", "workout"], categoryStems: ["gym", "sport", "fitness", "gimnasio", "deporte"]),
            Synonym(words: ["course", "book", "books", "tuition", "school", "college"], categoryStems: ["educa", "study", "course", "school", "estudio", "curso"]),
        ],
        weekdayPrefix: #"(?:on\s+|last\s+)?"#, weekdaySuffix: ""
    )
}

extension NSRegularExpression {
    func matches(in text: String) -> [RegexMatch] {
        matches(in: text, range: NSRange(text.startIndex..., in: text)).map { RegexMatch(result: $0, text: text) }
    }

    func replacingAll(in text: String, with template: String) -> String {
        stringByReplacingMatches(in: text, range: NSRange(text.startIndex..., in: text), withTemplate: template)
    }

    func replacingFirst(in text: String, with replacement: String) -> String {
        guard let first = firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              let range = Range(first.range, in: text) else { return text }
        return text.replacingCharacters(in: range, with: replacement)
    }
}

struct RegexMatch {
    let result: NSTextCheckingResult
    let text: String

    func group(_ index: Int) -> String? {
        guard index < result.numberOfRanges, let range = Range(result.range(at: index), in: text) else { return nil }
        return String(text[range])
    }
}
