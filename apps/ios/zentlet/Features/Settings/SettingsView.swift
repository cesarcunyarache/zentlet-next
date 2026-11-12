import SwiftUI
import ZentletCore

struct SettingsView: View {
    @Environment(SessionViewModel.self) private var session
    @State private var isDeleting = false
    @State private var deletePassword = ""

    var body: some View {
        @Bindable var session = session
        Form {
            if let user = session.user {
                Section {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(user.name).font(.headline)
                        Text(user.email).foregroundStyle(Palette.muted)
                    }
                }
            }

            Section {
                NavigationLink("Categories") { CategoriesView() }
                NavigationLink("Budgets") { BudgetsView() }
            }

            Section {
                Picker("Currency", selection: preferenceBinding(\.currency)) {
                    ForEach(Currency.allCases, id: \.self) { currency in
                        Text("\(currency.symbol) · \(currency.rawValue)").tag(currency)
                    }
                }
                Picker("Language", selection: preferenceBinding(\.language)) {
                    Text("Español").tag(AppLanguage.es)
                    Text("English").tag(AppLanguage.en)
                }
                LabeledContent("Time zone", value: session.preference.timezone)
            } header: {
                Text("Preferences")
            } footer: {
                Text("Existing shared lists keep their currency.")
            }

            Section {
                Button("Use device time zone") {
                    var preference = session.preference
                    preference.timezone = TimeZone.current.identifier
                    Task { await session.updatePreference(preference) }
                }
                .disabled(session.preference.timezone == TimeZone.current.identifier)
            }

            Section {
                ExportButton()
            } footer: {
                Text("A spreadsheet with all your movements.")
            }

            Section {
                Button("Sign out") { Task { await session.signOut() } }
                Button("Delete account", role: .destructive) { isDeleting = true }
            } footer: {
                Text("Deleting your account removes your categories and movements. Lists you own pass to their earliest editor or viewer.")
            }
        }
        .navigationTitle("Settings")
        .alert("Delete account", isPresented: $isDeleting) {
            SecureField("Password", text: $deletePassword)
            Button("Delete", role: .destructive) {
                let password = deletePassword
                deletePassword = ""
                Task { _ = await session.deleteAccount(password: password) }
            }
            Button("Cancel", role: .cancel) { deletePassword = "" }
        } message: {
            Text("This can't be undone. Enter your password to confirm.")
        }
        .errorAlert($session.errorMessage)
    }

    private func preferenceBinding<Value>(_ keyPath: WritableKeyPath<UserPreference, Value>) -> Binding<Value> {
        Binding(
            get: { session.preference[keyPath: keyPath] },
            set: { value in
                var preference = session.preference
                preference[keyPath: keyPath] = value
                Task { await session.updatePreference(preference) }
            }
        )
    }
}

private struct ExportButton: View {
    var body: some View {
        WithDependencies { dependencies in
            ExportButtonContent(model: ExportViewModel(repository: dependencies.exports))
        }
    }
}

private struct ExportButtonContent: View {
    @Environment(SessionViewModel.self) private var session
    @State private var model: ExportViewModel

    init(model: ExportViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        Group {
            if let url = model.fileURL {
                ShareLink(item: url) { Label("Share export", systemImage: "square.and.arrow.up") }
            } else {
                Button {
                    Task { await model.export(preference: session.preference) }
                } label: {
                    HStack {
                        Text("Export my data")
                        if model.isExporting { Spacer(); ProgressView() }
                    }
                }
                .disabled(model.isExporting)
            }
        }
        .errorAlert($model.errorMessage)
    }
}
