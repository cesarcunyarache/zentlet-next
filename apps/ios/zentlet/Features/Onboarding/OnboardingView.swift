import SwiftUI
import ZentletCore

/// Shown once after sign-up. Ports the web "budget" and "month" steps; the "type" and "voice" steps describe
/// AI suggestions and dictation that need the server, so they are left out until those features exist.
struct OnboardingView: View {
    private struct Page: Identifiable {
        let id: OnboardingStep
        let symbol: String
        let title: LocalizedStringKey
        let body: LocalizedStringKey
    }

    @Environment(\.dismiss) private var dismiss
    @Environment(SessionViewModel.self) private var session
    @State private var index = 0
    @State private var isCreatingCategory = false

    private let pages = [
        Page(
            id: .budget, symbol: "gauge.with.dots.needle.33percent", title: "Put a cap on your spending",
            body: "Set a budget per category, weekly, monthly or for the period you want, and see at a glance how much you have left. Long-press a category to create one."
        ),
        Page(
            id: .month, symbol: "chart.bar", title: "Your month, clear at a glance",
            body: "Balance, spending by category and your whole history. Start by creating your categories: food, transport, home…"
        ),
    ]

    private var isLast: Bool { index == pages.count - 1 }

    var body: some View {
        VStack(spacing: Spacing.xl) {
            HStack {
                Spacer()
                Button("Skip") { finish() }
                    .foregroundStyle(Palette.muted)
            }

            TabView(selection: $index) {
                ForEach(Array(pages.enumerated()), id: \.offset) { offset, page in
                    VStack(spacing: Spacing.lg) {
                        Image(systemName: page.symbol)
                            .font(.system(size: 56, weight: .light))
                            .foregroundStyle(Palette.foreground)
                            .accessibilityHidden(true)
                        Text(page.title)
                            .font(.title2.bold())
                            .multilineTextAlignment(.center)
                        Text(page.body)
                            .foregroundStyle(Palette.muted)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal, Spacing.xl)
                    .tag(offset)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .always))
            .indexViewStyle(.page(backgroundDisplayMode: .always))

            if isLast {
                VStack(spacing: Spacing.sm) {
                    PrimaryButton(title: "Create my first category") { isCreatingCategory = true }
                    Button("Start") { finish() }
                }
            } else {
                PrimaryButton(title: "Next") { withAnimation { index += 1 } }
            }
        }
        .padding(Spacing.lg)
        .background(Palette.background)
        .sheet(isPresented: $isCreatingCategory, onDismiss: finish) { CategoryFormView(editing: nil) }
    }

    private func finish() {
        Task {
            await session.completeOnboarding()
            dismiss()
        }
    }
}
