import AuthenticationServices
import SwiftUI
import ZentletCore

/// Bank emails detected as movements: review, adjust and accept, or dismiss.
struct InboxView: View {
    var body: some View {
        WithDependencies { dependencies in
            InboxScreen(model: InboxViewModel(dependencies: dependencies))
        }
    }
}

private struct InboxScreen: View {
    @Environment(SessionViewModel.self) private var session
    @State private var model: InboxViewModel
    @State private var reviewing: InboxItem?

    init(model: InboxViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        List {
            if !model.isAvailable {
                ContentUnavailableView(
                    "Not available", systemImage: "envelope.badge",
                    description: Text("Importing bank emails needs the Zentlet server. It works when the app is connected to your account online.")
                )
            } else {
                Section {
                    NavigationLink("Email import settings") { InboxSettingsView(model: model) }
                }
                Section {
                    if model.items.isEmpty {
                        Text("No bank emails waiting.").foregroundStyle(Palette.muted)
                    }
                    ForEach(model.items) { item in
                        Button { reviewing = item } label: { InboxRow(item: item, category: item.categoryId.flatMap { model.categories[$0] }) }
                            .buttonStyle(.plain)
                            .swipeActions {
                                Button("Dismiss", role: .destructive) { Task { await model.dismiss(item) } }
                            }
                    }
                } header: {
                    SectionHeader(title: "To review")
                }
            }
        }
        .navigationTitle("Bank emails")
        .task { await model.load() }
        .refreshable { await model.load() }
        .sheet(item: $reviewing) { item in
            InboxAcceptSheet(item: item, model: model, currency: session.preference.currency)
        }
        .errorAlert($model.errorMessage)
    }
}

private struct InboxRow: View {
    let item: InboxItem
    let category: ZentletCore.Category?

    var body: some View {
        HStack(spacing: Spacing.md) {
            IconBadge(icon: category?.icon ?? "✉️", color: category?.color ?? "")
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                HStack(spacing: Spacing.xs) {
                    Text(item.merchant ?? item.description).lineLimit(1)
                    if item.duplicateOfId != nil {
                        Text("Possible duplicate").font(Typography.caption).foregroundStyle(Palette.destructive)
                    }
                }
                Text([item.bank, item.cardLast4.map { "•••• \($0)" }, item.transactionDate.iso].compactMap { $0 }.joined(separator: " · "))
                    .font(Typography.caption)
                    .foregroundStyle(Palette.muted)
            }
            Spacer()
            if let amount = item.amount {
                Text("\(item.currency ?? "") \(Money.formatNumber(amount))")
                    .font(Typography.amount)
                    .foregroundStyle(item.type == .income ? Palette.income : Palette.foreground)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

/// Edit what the email said before saving it as a movement.
private struct InboxAcceptSheet: View {
    @Environment(\.dismiss) private var dismiss
    let item: InboxItem
    let model: InboxViewModel
    let currency: Currency

    @State private var type: TransactionType = .expense
    @State private var amountText = ""
    @State private var description = ""
    @State private var categoryId: UUID?
    @State private var date = CalendarDay.today(in: .current)

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Type", selection: $type) {
                        Text("Expense").tag(TransactionType.expense)
                        Text("Income").tag(TransactionType.income)
                    }
                    .pickerStyle(.segmented)
                    TextField("0.00", text: Binding(get: { amountText }, set: { amountText = Money.cleanInput($0) }))
                        .keyboardType(.decimalPad)
                        .font(Typography.amount)
                    TextField("Description", text: $description)
                    Picker("Category", selection: $categoryId) {
                        Text("Choose").tag(UUID?.none)
                        ForEach(model.categories.values.sorted { $0.name < $1.name }) { Text("\($0.icon) \($0.name)").tag(UUID?.some($0.id)) }
                    }
                    DatePicker("Date", selection: Binding(
                        get: { date.date }, set: { date = CalendarDay(date: $0, timeZone: TimeZone(identifier: "UTC")!) }
                    ), displayedComponents: .date)
                    .environment(\.timeZone, TimeZone(identifier: "UTC")!)
                }
                Section("Email") {
                    LabeledContent("From", value: item.senderAddress)
                    Text(item.subject).font(Typography.caption).foregroundStyle(Palette.muted)
                }
            }
            .navigationTitle("Review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        guard let categoryId else { return }
                        let draft = TransactionDraft(
                            type: type, amount: Money.parse(amountText), categoryId: categoryId, transactionDate: date, description: description
                        )
                        Task { if await model.accept(item, draft: draft) { dismiss() } }
                    }
                    .disabled(categoryId == nil || Money.parse(amountText) <= 0)
                }
            }
            .onAppear {
                type = item.type
                amountText = item.amount.map { "\($0)" } ?? ""
                description = String(item.description.prefix(TransactionFormViewModel.descriptionMaxLength))
                categoryId = item.categoryId
                date = item.transactionDate
            }
        }
    }
}

/// Forwarding address, trusted senders and Gmail.
struct InboxSettingsView: View {
    @Environment(\.webAuthenticationSession) private var webAuthenticationSession
    @Bindable var model: InboxViewModel
    @State private var gmailResult: GmailConnectResult?

    var body: some View {
        Form {
            Section {
                if model.connection.gmailActive, let email = model.connection.gmailEmail {
                    LabeledContent("Gmail", value: email)
                    Button("Disconnect Gmail", role: .destructive) { Task { await model.disconnectGmail() } }
                } else if model.connection.gmailAvailable {
                    Button("Connect Gmail", systemImage: "envelope") { Task { await connectGmail() } }
                } else {
                    Text("Gmail isn't available right now.").foregroundStyle(Palette.muted)
                }
            } footer: {
                if let gmailResult { Text(Self.message(for: gmailResult)) }
            }

            Section {
                if let address = model.connection.address {
                    LabeledContent("Forward to") { Text(address).textSelection(.enabled) }
                    if let code = model.connection.verificationCode {
                        LabeledContent("Verification code") { Text(code).font(.body.monospaced()).textSelection(.enabled) }
                    }
                    if let url = model.connection.verificationURL { Link("Verify forwarding", destination: url) }
                } else {
                    Button("Create forwarding address") { Task { await model.createForwardingAddress() } }
                }
            } header: {
                Text("Forwarding")
            } footer: {
                Text("Forward your bank's notification emails to this address to import them.")
            }

            Section("Senders") {
                ForEach(model.connection.senders) { sender in
                    HStack {
                        Text(sender.address)
                        Spacer()
                        Text(sender.status == .blocked ? "Blocked" : "Trusted").font(Typography.caption).foregroundStyle(Palette.muted)
                    }
                    .swipeActions { Button("Remove", role: .destructive) { Task { await model.removeSender(sender) } } }
                }
                HStack {
                    TextField("bank@example.com", text: $model.newSender)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Button("Add") { Task { await model.addSender() } }
                        .disabled(model.newSender.count < 3)
                }
            }
        }
        .navigationTitle("Email import")
        .errorAlert($model.errorMessage)
    }

    /// Runs the server's Gmail authorization in a browser sheet and reads `?gmail=` from the return URL.
    private func connectGmail() async {
        guard let url = await model.gmailConnectURL(), let host = url.host() else { return }
        do {
            let callback = try await webAuthenticationSession.authenticate(
                using: url, callback: .https(host: host, path: "/admin"), preferredBrowserSession: .shared, additionalHeaderFields: [:]
            )
            gmailResult = await model.finishGmailConnect(callback: callback)
        } catch {
            gmailResult = .cancelled
        }
    }

    private static func message(for result: GmailConnectResult) -> String {
        switch result {
        case .connected: String(localized: "Gmail connected.")
        case .cancelled: String(localized: "Gmail connection cancelled.")
        case .scopeDenied: String(localized: "Zentlet needs permission to read your bank emails.")
        case .taken: String(localized: "That Gmail account is linked to another Zentlet account.")
        case .unavailable: String(localized: "Gmail isn't available right now.")
        case .error: String(localized: "Couldn't connect Gmail. Try again.")
        }
    }
}
