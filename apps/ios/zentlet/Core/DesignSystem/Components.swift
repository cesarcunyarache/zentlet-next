import SwiftUI
import ZentletCore

extension Color {
    /// "#RRGGBB" (or "RRGGBB"); falls back to gray for anything else.
    init(hex: String) {
        let digits = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        guard digits.count == 6, let value = UInt32(digits, radix: 16) else {
            self = .gray
            return
        }
        self.init(
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }
}

/// Emoji on a soft tinted square: the icon of a category or list.
struct IconBadge: View {
    let icon: String
    let color: String
    var size: CGFloat = 36

    var body: some View {
        Text(icon.isEmpty ? ZentletCore.Category.fallbackIcon : icon)
            .font(.system(size: size * 0.5))
            .frame(width: size, height: size)
            .background(Color(hex: color).opacity(0.18), in: RoundedRectangle(cornerRadius: Radius.md))
            .accessibilityHidden(true)
    }
}

/// An amount in the account currency. Income reads green; expenses stay neutral (minimalist palette).
struct AmountText: View {
    enum Style { case plain, signed }

    let value: Decimal
    let currency: Currency
    var style: Style = .signed
    var font: Font = Typography.amount

    var body: some View {
        Text(style == .signed ? Money.formatSigned(value, currency: currency) : Money.format(value, currency: currency))
            .font(font)
            .foregroundStyle(value > 0 && style == .signed ? Palette.income : Palette.foreground)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
    }
}

struct PrimaryButton: View {
    let title: LocalizedStringKey
    var isLoading = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Text(title).opacity(isLoading ? 0 : 1)
                if isLoading { ProgressView() }
            }
            .font(.body.weight(.semibold))
            .frame(maxWidth: .infinity, minHeight: 50)
        }
        .buttonStyle(.borderedProminent)
        .buttonBorderShape(.roundedRectangle(radius: Radius.lg))
        .disabled(isLoading)
    }
}

/// Section label used above grouped content.
struct SectionHeader: View {
    let title: LocalizedStringKey

    var body: some View {
        Text(title)
            .font(Typography.sectionTitle)
            .foregroundStyle(Palette.muted)
            .textCase(.uppercase)
            .accessibilityAddTraits(.isHeader)
    }
}

extension View {
    /// Shows `message` in an alert and clears it on dismiss.
    func errorAlert(_ message: Binding<String?>) -> some View {
        alert(
            "Something went wrong",
            isPresented: Binding(get: { message.wrappedValue != nil }, set: { if !$0 { message.wrappedValue = nil } }),
            actions: { Button("OK", role: .cancel) {} },
            message: { Text(message.wrappedValue ?? "") }
        )
    }
}

extension CalendarDay {
    /// "Today", "Yesterday" or a medium date in the device locale.
    func relativeTitle(today: CalendarDay) -> String {
        if self == today { return String(localized: "Today") }
        if self == today.addingDays(-1) { return String(localized: "Yesterday") }
        return date.formatted(Date.FormatStyle(date: .abbreviated, time: .omitted, timeZone: TimeZone(identifier: "UTC")!))
    }

    /// "Nov 1 – 15" for a half-open range (the end day is `to - 1`).
    static func rangeTitle(_ range: DayRange) -> String {
        guard let from = range.from, let to = range.to else { return String(localized: "All time") }
        let style = Date.FormatStyle(date: .abbreviated, time: .omitted, timeZone: TimeZone(identifier: "UTC")!)
        return "\(from.date.formatted(style)) – \(to.addingDays(-1).date.formatted(style))"
    }
}
