import SwiftUI

enum Spacing {
    static let xxs: CGFloat = 2
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
}

enum Radius {
    static let sm: CGFloat = 6
    static let md: CGFloat = 8
    static let lg: CGFloat = 12
    static let pill: CGFloat = 999
}

/// Minimalist palette mirroring the web tokens: neutral grays, one success green.
/// System semantic colors give Dark Mode and Increase Contrast for free.
enum Palette {
    static let background = Color(uiColor: .systemGroupedBackground)
    static let surface = Color(uiColor: .secondarySystemGroupedBackground)
    static let foreground = Color.primary
    static let muted = Color.secondary
    static let border = Color(uiColor: .separator)
    static let income = Color(red: 0.13, green: 0.70, blue: 0.40)
    static let expense = Color.primary
    static let destructive = Color.red
}

enum Typography {
    static let amountHero = Font.system(.largeTitle, design: .rounded).weight(.semibold).monospacedDigit()
    static let amount = Font.system(.body, design: .rounded).weight(.medium).monospacedDigit()
    static let sectionTitle = Font.footnote.weight(.semibold)
    static let caption = Font.caption
}
