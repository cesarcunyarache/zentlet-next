import SwiftUI
import ZentletCore

struct ListsView: View {
    let currentUserId: UUID

    var body: some View {
        WithDependencies { dependencies in
            ListsScreen(model: ListsViewModel(repository: dependencies.lists), currentUserId: currentUserId)
        }
    }
}

private struct ListsScreen: View {
    @State private var model: ListsViewModel
    @State private var isCreating = false
    @State private var isJoining = false
    let currentUserId: UUID

    init(model: ListsViewModel, currentUserId: UUID) {
        _model = State(initialValue: model)
        self.currentUserId = currentUserId
    }

    var body: some View {
        List(model.memberships) { membership in
            NavigationLink {
                ListDetailView(listId: membership.list.id, currentUserId: currentUserId)
            } label: {
                ListRow(membership: membership)
            }
        }
        .navigationTitle("Lists")
        .toolbar {
            Menu("Add", systemImage: "plus") {
                Button("New list", systemImage: "plus.rectangle.on.rectangle") { isCreating = true }
                Button("Join with a code", systemImage: "person.badge.plus") { isJoining = true }
            }
        }
        .task { await model.load() }
        .refreshable { await model.load() }
        .sheet(isPresented: $isCreating, onDismiss: reload) { ListFormView(editing: nil) }
        .sheet(isPresented: $isJoining, onDismiss: reload) { JoinListView() }
        .errorAlert($model.errorMessage)
    }

    private func reload() {
        Task { await model.load() }
    }
}

private struct ListRow: View {
    let membership: ListMembership

    var body: some View {
        HStack(spacing: Spacing.md) {
            IconBadge(icon: membership.list.icon, color: membership.list.color)
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(membership.list.name)
                Text(subtitle)
                    .font(Typography.caption)
                    .foregroundStyle(Palette.muted)
            }
            Spacer(minLength: Spacing.sm)
            AmountText(value: membership.totals.balance, currency: membership.list.currency)
        }
        .accessibilityElement(children: .combine)
    }

    private var subtitle: String {
        if membership.list.isPrivate { return String(localized: "Only you") }
        let people = String(localized: "\(membership.memberCount) members")
        return "\(people) · \(RoleLabel.text(membership.role))"
    }
}

enum RoleLabel {
    static func text(_ role: ListRole) -> String {
        switch role {
        case .owner: String(localized: "Owner")
        case .editor: String(localized: "Editor")
        case .viewer: String(localized: "Viewer")
        }
    }

    static func text(_ role: InviteRole) -> String { text(role.listRole) }
}

struct ListFormView: View {
    let editing: TransactionList?

    var body: some View {
        WithDependencies { dependencies in
            ListFormScreen(model: ListFormViewModel(repository: dependencies.lists, editing: editing))
        }
    }
}

private struct ListFormScreen: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(SessionViewModel.self) private var session
    @State private var model: ListFormViewModel

    init(model: ListFormViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $model.name)
                    EmojiField(icon: $model.icon)
                    ColorRow(selection: $model.color)
                }
                Section("Description") {
                    TextField("Optional", text: $model.description, axis: .vertical)
                }
                if model.editing == nil {
                    Section {
                        LabeledContent("Currency", value: "\(session.preference.currency.symbol) · \(session.preference.currency.rawValue)")
                    } footer: {
                        Text("A list uses your account currency and can't change it later.")
                    }
                }
            }
            .navigationTitle(model.editing == nil ? "New list" : "Edit list")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { if await model.save() != nil { dismiss() } } }
                        .disabled(!model.canSave)
                }
            }
            .errorAlert($model.errorMessage)
        }
    }
}

struct JoinListView: View {
    var token = ""

    var body: some View {
        WithDependencies { dependencies in
            JoinListScreen(model: JoinListViewModel(repository: dependencies.listInvites, token: token))
        }
    }
}

private struct JoinListScreen: View {
    @Environment(\.dismiss) private var dismiss
    @State private var model: JoinListViewModel

    init(model: JoinListViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Invite code", text: $model.token)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .font(.body.monospaced())
                    Button("Check invite") { Task { await model.loadPreview() } }
                        .disabled(model.token.isEmpty || model.isWorking)
                } footer: {
                    Text("Ask the list owner for an invite code.")
                }

                if let preview = model.preview {
                    Section {
                        LabeledContent("List", value: "\(preview.listIcon) \(preview.listName)")
                        LabeledContent("Owner", value: preview.ownerName)
                        LabeledContent("Role", value: RoleLabel.text(preview.role))
                        LabeledContent("Currency", value: preview.currency.rawValue)
                    }
                    Section {
                        if preview.alreadyMember {
                            Text("You're already a member of this list.")
                                .foregroundStyle(Palette.muted)
                        } else {
                            PrimaryButton(title: "Join list", isLoading: model.isWorking) {
                                Task { if await model.accept() { dismiss() } }
                            }
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                        }
                    }
                }
            }
            .task { if !model.token.isEmpty { await model.loadPreview() } }
            .navigationTitle("Join a list")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
            }
            .errorAlert($model.errorMessage)
        }
    }
}
