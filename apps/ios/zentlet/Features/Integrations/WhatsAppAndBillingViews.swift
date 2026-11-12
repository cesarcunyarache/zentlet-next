import SwiftUI
import ZentletCore

/// Record movements by sending WhatsApp messages. Linking: send "vincular XXXX-XXXX" to Zentlet from WhatsApp.
struct WhatsAppView: View {
    var body: some View {
        WithDependencies { dependencies in
            WhatsAppScreen(model: WhatsAppViewModel(dependencies: dependencies))
        }
    }
}

private struct WhatsAppScreen: View {
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @State private var model: WhatsAppViewModel

    init(model: WhatsAppViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        Form {
            if !model.isAvailable {
                ContentUnavailableView(
                    "Not available", systemImage: "message",
                    description: Text("WhatsApp needs the Zentlet server. It works when the app is connected to your account online.")
                )
            } else if model.isLinked {
                Section {
                    LabeledContent("Phone", value: model.connection.phone ?? "")
                    if let linkedAt = model.connection.linkedAt {
                        LabeledContent("Linked", value: linkedAt.formatted(date: .abbreviated, time: .omitted))
                    }
                } footer: {
                    Text("Send messages like “lunch 25” to Zentlet on WhatsApp to record them.")
                }
                Section { Button("Unlink WhatsApp", role: .destructive) { Task { await model.unlink() } } }
            } else {
                Section {
                    Button("Link WhatsApp", systemImage: "message") {
                        Task { if let url = await model.startLinking() { openURL(url) } }
                    }
                    if let code = model.linkCode {
                        LabeledContent("Code") { Text(code.code).font(.body.monospaced()).textSelection(.enabled) }
                        Text("Expires \(code.expiresAt.formatted(.relative(presentation: .named)))")
                            .font(Typography.caption)
                            .foregroundStyle(Palette.muted)
                    }
                } footer: {
                    Text("WhatsApp opens with a message ready. Send it to link this phone; the code lasts 10 minutes.")
                }
            }
        }
        .navigationTitle("WhatsApp")
        .task { await model.load() }
        .onChange(of: scenePhase) { if scenePhase == .active { Task { await model.load() } } }
        .errorAlert($model.errorMessage)
    }
}

/// Plan and subscription. Checkout opens the web payment page only when `AppConfiguration` allows it
/// (App Store rules: see apps/ios/README.md).
struct BillingView: View {
    var body: some View {
        WithDependencies { dependencies in
            BillingScreen(model: BillingViewModel(dependencies: dependencies))
        }
    }
}

private struct BillingScreen: View {
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @State private var model: BillingViewModel
    @State private var confirmCancel = false
    @State private var returnedFromCheckout = false

    init(model: BillingViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        Form {
            if let summary = model.summary {
                Section {
                    LabeledContent("Plan", value: summary.plan.capitalized)
                    if let status = summary.status { LabeledContent("Status", value: Self.label(status)) }
                    if let trialEndsAt = summary.trialEndsAt, summary.status == .trialing {
                        LabeledContent("Trial ends", value: trialEndsAt.formatted(date: .abbreviated, time: .omitted))
                    }
                    if let periodEnd = summary.currentPeriodEnd {
                        LabeledContent("Renews", value: periodEnd.formatted(date: .abbreviated, time: .omitted))
                    }
                } footer: {
                    if !model.hasServer { Text("All features are free while testing.") }
                }

                if model.hasServer {
                    if summary.isPaid {
                        Section { Button("Cancel subscription", role: .destructive) { confirmCancel = true } }
                    } else if AppConfiguration.current.allowsExternalCheckout {
                        Section {
                            Button(summary.isTrialEligible ? "Start free trial" : "Upgrade to Pro") {
                                Task {
                                    guard let url = await model.checkoutURL() else { return }
                                    returnedFromCheckout = true
                                    openURL(url)
                                }
                            }
                            .disabled(model.isWorking || summary.hasPendingCheckout)
                        } footer: {
                            Text("Pro: \(summary.currency) \(Money.formatNumber(summary.price)) per \(summary.interval).")
                        }
                    } else {
                        Section {
                            Text("Manage your subscription on the Zentlet website.").foregroundStyle(Palette.muted)
                        }
                    }
                }
            }
        }
        .navigationTitle("Subscription")
        .task { await model.load() }
        .onChange(of: scenePhase) {
            guard scenePhase == .active, returnedFromCheckout else { return }
            returnedFromCheckout = false
            Task { await model.sync() }
        }
        .confirmationDialog("Cancel your subscription?", isPresented: $confirmCancel, titleVisibility: .visible) {
            Button("Cancel subscription", role: .destructive) { Task { await model.cancel() } }
        }
        .errorAlert($model.errorMessage)
    }

    private static func label(_ status: SubscriptionStatus) -> String {
        switch status {
        case .pending: String(localized: "Pending")
        case .trialing: String(localized: "Trial")
        case .active: String(localized: "Active")
        case .pastDue: String(localized: "Payment due")
        case .canceled: String(localized: "Canceled")
        }
    }
}
