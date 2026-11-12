import Foundation

/// A calendar date without time or zone (`YYYY-MM-DD`), like Postgres `@db.Date` on the web.
public struct CalendarDay: Hashable, Comparable, Sendable {
    public let year: Int
    public let month: Int
    public let day: Int

    public static let validYears = 1900...2100

    public init?(year: Int, month: Int, day: Int) {
        guard Self.validYears.contains(year),
              let date = Self.gregorian.date(from: DateComponents(year: year, month: month, day: day)) else { return nil }
        let parts = Self.gregorian.dateComponents([.year, .month, .day], from: date)
        guard parts.year == year, parts.month == month, parts.day == day else { return nil }
        self.year = year
        self.month = month
        self.day = day
    }

    /// Parses `YYYY-MM-DD`. Rejects malformed strings and days that do not exist (e.g. 2026-02-30).
    public init?(iso: String) {
        let parts = iso.split(separator: "-", omittingEmptySubsequences: false)
        guard iso.count == 10, parts.count == 3, parts[0].count == 4, parts[1].count == 2, parts[2].count == 2,
              let year = Int(parts[0]), let month = Int(parts[1]), let day = Int(parts[2]) else { return nil }
        self.init(year: year, month: month, day: day)
    }

    /// The calendar day of `date` as seen in `timeZone`.
    public init(date: Date, timeZone: TimeZone) {
        var calendar = Self.gregorian
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        self.year = parts.year!
        self.month = parts.month!
        self.day = parts.day!
    }

    public static func today(in timeZone: TimeZone, now: Date = .now) -> CalendarDay {
        CalendarDay(date: now, timeZone: timeZone)
    }

    public var iso: String { String(format: "%04d-%02d-%02d", year, month, day) }

    /// Sortable integer key (20261111) used for range queries in storage.
    public var key: Int { year * 10_000 + month * 100 + day }

    public init?(key: Int) {
        self.init(year: key / 10_000, month: (key / 100) % 100, day: key % 100)
    }

    public var startOfMonth: CalendarDay { CalendarDay(year: year, month: month, day: 1)! }

    public func adding(months: Int) -> CalendarDay {
        let total = year * 12 + (month - 1) + months
        let newYear = total / 12
        let newMonth = total % 12 + 1
        let lastDay = Self.daysIn(year: newYear, month: newMonth)
        return CalendarDay(year: newYear, month: newMonth, day: min(day, lastDay))!
    }

    /// Midday UTC: a stable `Date` to feed `DatePicker` without shifting the day across time zones.
    public var date: Date {
        var calendar = Self.gregorian
        calendar.timeZone = TimeZone(identifier: "UTC")!
        return calendar.date(from: DateComponents(year: year, month: month, day: day, hour: 12))!
    }

    public static func < (lhs: CalendarDay, rhs: CalendarDay) -> Bool { lhs.key < rhs.key }

    static func daysIn(year: Int, month: Int) -> Int {
        let date = gregorian.date(from: DateComponents(year: year, month: month, day: 1))!
        return gregorian.range(of: .day, in: .month, for: date)!.count
    }

    private static let gregorian = Calendar(identifier: .gregorian)
}

extension CalendarDay: Codable {
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)
        guard let day = CalendarDay(iso: raw) else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid calendar day: \(raw)")
        }
        self = day
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(iso)
    }
}

/// Half-open range of days: `from` inclusive, `to` exclusive (same as the web feed queries).
public struct DayRange: Hashable, Sendable {
    public let from: CalendarDay?
    public let to: CalendarDay?

    public init(from: CalendarDay?, to: CalendarDay?) {
        self.from = from
        self.to = to
    }

    public static let allTime = DayRange(from: nil, to: nil)

    public func contains(_ day: CalendarDay) -> Bool {
        if let from, day < from { return false }
        if let to, day >= to { return false }
        return true
    }
}

/// Home period selector: current month (default), previous month or all time.
public enum SummaryPeriod: String, CaseIterable, Sendable {
    case month
    case previous
    case all

    public func range(today: CalendarDay) -> DayRange {
        let start = today.startOfMonth
        switch self {
        case .month: return DayRange(from: start, to: start.adding(months: 1))
        case .previous: return DayRange(from: start.adding(months: -1), to: start)
        case .all: return .allTime
        }
    }
}
