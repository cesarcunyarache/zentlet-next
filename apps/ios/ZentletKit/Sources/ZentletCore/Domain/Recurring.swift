import Foundation

public enum RecurrenceFrequency: String, CaseIterable, Codable, Sendable {
    case weekly = "WEEKLY"
    case monthly = "MONTHLY"
    case quarterly = "QUARTERLY"
    case semiannual = "SEMIANNUAL"
    case annual = "ANNUAL"

    var monthsPerStep: Int? {
        switch self {
        case .weekly: nil
        case .monthly: 1
        case .quarterly: 3
        case .semiannual: 6
        case .annual: 12
        }
    }
}

/// A repeating movement. Occurrences always land in the author's private list.
public struct RecurringTransaction: Identifiable, Hashable, Sendable {
    public let id: UUID
    public let frequency: RecurrenceFrequency
    public let nextDueDate: CalendarDay

    public init(id: UUID, frequency: RecurrenceFrequency, nextDueDate: CalendarDay) {
        self.id = id
        self.frequency = frequency
        self.nextDueDate = nextDueDate
    }
}

/// Occurrence dates. Mirrors `recurring/lib/schedule.ts`: weekly steps of 7 days; monthly-type steps keep the
/// anchor day, clamped to the end of shorter months.
public enum RecurrenceSchedule {
    /// At most this many occurrences are created per run (same cap as the web cron).
    public static let maxPerRun = 60

    public static func occurrence(anchor: CalendarDay, frequency: RecurrenceFrequency, index: Int) -> CalendarDay {
        guard let months = frequency.monthsPerStep else { return anchor.addingDays(7 * index) }
        return anchor.adding(months: index * months)
    }

    public static func nextOccurrence(anchor: CalendarDay, frequency: RecurrenceFrequency, after day: CalendarDay) -> CalendarDay {
        var index = max(1, estimatedIndex(anchor: anchor, frequency: frequency, day: day))
        while occurrence(anchor: anchor, frequency: frequency, index: index) <= day { index += 1 }
        return occurrence(anchor: anchor, frequency: frequency, index: index)
    }

    /// First due date of a new series: the next occurrence after the later of the anchor and today.
    public static func firstDueDate(anchor: CalendarDay, frequency: RecurrenceFrequency, today: CalendarDay) -> CalendarDay {
        nextOccurrence(anchor: anchor, frequency: frequency, after: max(anchor, today))
    }

    /// Dates due up to and including `today`, and the next due date after them.
    public static func dueDates(
        anchor: CalendarDay, frequency: RecurrenceFrequency, nextDueDate: CalendarDay, through today: CalendarDay, limit: Int = maxPerRun
    ) -> (dates: [CalendarDay], nextDueDate: CalendarDay) {
        var dates: [CalendarDay] = []
        var due = nextDueDate
        while due <= today, dates.count < limit {
            dates.append(due)
            due = nextOccurrence(anchor: anchor, frequency: frequency, after: due)
        }
        return (dates, due)
    }

    private static func estimatedIndex(anchor: CalendarDay, frequency: RecurrenceFrequency, day: CalendarDay) -> Int {
        guard let months = frequency.monthsPerStep else {
            let days = Calendar.utcGregorian.dateComponents([.day], from: anchor.date, to: day.date).day ?? 0
            return Int((Double(days) / 7).rounded(.down))
        }
        let elapsed = (day.year - anchor.year) * 12 + day.month - anchor.month
        return Int((Double(elapsed) / Double(months)).rounded(.down))
    }
}
