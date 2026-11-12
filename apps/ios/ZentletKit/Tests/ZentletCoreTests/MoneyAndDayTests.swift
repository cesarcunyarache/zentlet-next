import Foundation
import Testing
@testable import ZentletCore

struct MoneyTests {
    @Test func formatsWithGroupingAndTwoDecimals() {
        #expect(Money.format(1234.5, currency: .pen) == "S/ 1,234.50")
        #expect(Money.format(-20, currency: .usd) == "$ 20.00")
    }

    @Test func formatsSignedAmounts() {
        #expect(Money.formatSigned(-10, currency: .eur) == "− € 10.00")
        #expect(Money.formatSigned(10, currency: .cop) == "+ $COP 10.00")
    }

    @Test(arguments: [
        (Decimal(950), "950"), (Decimal(1200), "1.2k"), (Decimal(35000), "35k"),
        (Decimal(150_000), "150k"), (Decimal(1_500_000), "1.5M"), (Decimal(999.6), "1k"),
    ])
    func formatsShort(value: Decimal, expected: String) {
        #expect(Money.formatShort(value) == expected)
    }

    @Test(arguments: [
        ("12,5", "12.5"), ("0012", "12"), ("1.234", "1.23"), ("1.2.3", "1.23"),
        ("abc7", "7"), ("12345678901", "123456789"), ("0.5", "0.5"),
    ])
    func cleansInput(raw: String, expected: String) {
        #expect(Money.cleanInput(raw) == expected)
    }

    @Test func parsesAndRoundsToCents() {
        #expect(Money.parse("12.345") == Decimal(string: "12.35"))
        #expect(Money.parse("") == 0)
    }

    @Test func decimalAvoidsFloatingPointDrift() {
        let total = [Decimal(string: "0.1")!, Decimal(string: "0.2")!].reduce(0, +)
        #expect(total == Decimal(string: "0.3"))
    }
}

struct CalendarDayTests {
    @Test func parsesValidIsoDays() {
        #expect(CalendarDay(iso: "2026-02-28")?.key == 20260228)
        #expect(CalendarDay(iso: "2024-02-29") != nil)
    }

    @Test(arguments: ["2026-02-30", "2025-02-29", "1899-12-31", "2101-01-01", "2026-1-01", "20260101", "abcd-ef-gh"])
    func rejectsInvalidDays(raw: String) {
        #expect(CalendarDay(iso: raw) == nil)
    }

    @Test func todayUsesTheGivenTimeZone() {
        let instant = Date(timeIntervalSince1970: 1_762_916_400) // 2025-11-12T03:00:00Z
        #expect(CalendarDay(date: instant, timeZone: TimeZone(identifier: "America/Lima")!).iso == "2025-11-11")
        #expect(CalendarDay(date: instant, timeZone: TimeZone(identifier: "UTC")!).iso == "2025-11-12")
    }

    @Test func addingMonthsClampsToMonthEnd() {
        #expect(CalendarDay(iso: "2026-01-31")!.adding(months: 1).iso == "2026-02-28")
        #expect(CalendarDay(iso: "2026-01-15")!.adding(months: -1).iso == "2025-12-15")
    }

    @Test func periodsAreHalfOpenMonths() {
        let today = CalendarDay(iso: "2026-11-11")!
        let month = SummaryPeriod.month.range(today: today)
        #expect(month.from?.iso == "2026-11-01")
        #expect(month.to?.iso == "2026-12-01")
        #expect(month.contains(CalendarDay(iso: "2026-11-30")!))
        #expect(!month.contains(CalendarDay(iso: "2026-12-01")!))
        let previous = SummaryPeriod.previous.range(today: today)
        #expect(previous.from?.iso == "2026-10-01")
        #expect(previous.to?.iso == "2026-11-01")
        #expect(SummaryPeriod.all.range(today: today) == .allTime)
    }

    @Test func codesAsIsoString() throws {
        let data = try JSONEncoder().encode([CalendarDay(iso: "2026-03-04")!])
        #expect(String(decoding: data, as: UTF8.self) == "[\"2026-03-04\"]")
        #expect(try JSONDecoder().decode([CalendarDay].self, from: data).first?.iso == "2026-03-04")
    }
}
