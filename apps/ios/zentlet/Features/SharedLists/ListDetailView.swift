import SwiftUI
import ZentletCore

struct ListDetailView: View {
    let listId: UUID
    let currentUserId: UUID

    var body: some View {
        WithDependencies { dependencies in
            ListDetailScreen(model: ListDetailViewModel(listId: listId, currentUserId: currentUserId, dependencies: dependencies))
        }
    }
}

private struct ListDetailScreen: View {
    @Environment(\.dismiss) private var dismiss
    @State private var model: ListDetailViewModel
    @State private var isEditing = false
    @State private var isInviting = false
    @State private var confirmDelete = false
    @State private var confirmLeave = false
    @State private var isAssigning = false

    init(model: ListDetailViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        List {
            if let detail = model.detail {
                totalsSection(detail)
                if !detail.membership.list.isPrivate { membersSection }
                entriesSection(currency: detail.membership.list.currency)
                if model.canManage, !model.invites.isEmpty { invitesSection }
                dangerSection
            }
        }
        .navigationTitle(model.list.map { "\($0.icon) \($0.name)" } ?? "")
        .toolbar {
            if model.canManage || model.canContribute {
                Menu("Manage", systemImage: "ellipsis.circle") {
                    if model.canContribute {
                        Button("Add my movements", systemImage: "tray.and.arrow.down") { isAssigning = true }
                    }
                    if model.canManage {
                        Button("Invite", systemImage: "person.badge.plus") { isInviting = true }
                        Button("Edit list", systemImage: "pencil") { isEditing = true }
                    }
                }
            }
        }
        .overlay { if model.detail == nil, model.isLoading { ProgressView() } }
        .task { await model.load() }
        .refreshable { await model.load() }
        .sheet(isPresented: $isEditing, onDismiss: reload) { ListFormView(editing: model.list) }
        .sheet(isPresented: $isInviting) { InviteSheet(model: model) }
        .sheet(isPresented: $isAssigning) { AssignSheet(model: model) }
        .confirmationDialog("Delete this list?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete list and its movements", role: .destructive) {
                Task { if await model.deleteList() { dismiss() } }
            }
        } message: {
            Text("Every movement in the list is deleted, including other members' movements.")
        }
        .confirmationDialog("Leave this list?", isPresented: $confirmLeave, titleVisibility: .visible) {
            Button("Leave", role: .destructive) {
                Task { if await model.leave() { dismiss() } }
            }
        } message: {
            Text("Your movements in this list go back to your private list.")
        }
        .errorAlert($model.errorMessage)
    }

    private func totalsSection(_ detail: ListDetail) -> some View {
        Section {
            let currency = detail.membership.list.currency
            LabeledContent("Expenses") { AmountText(value: -detail.breakdown.totals.expense, currency: currency) }
            LabeledContent("Income") { AmountText(value: detail.breakdown.totals.income, currency: currency) }
            LabeledContent("Balance") { AmountText(value: detail.breakdown.totals.balance, currency: currency) }
        } header: {
            SectionHeader(title: "Totals")
        }
    }

    /// Per-member breakdown: what each person recorded in the list.
    private var membersSection: some View {
        Section {
            ForEach(model.memberShares, id: \.member.userId) { row in
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    HStack {
                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            Text(row.member.userId == model.currentUserId ? String(localized: "You") : row.member.name)
                            Text("\(RoleLabel.text(row.member.role)) · \(row.totals.count) movements")
                                .font(Typography.caption)
                                .foregroundStyle(Palette.muted)
                        }
                        Spacer()
                        AmountText(value: -row.totals.totals.expense, currency: model.list?.currency ?? .default)
                    }
                    ProgressView(value: row.share)
                        .tint(Palette.foreground)
                        .accessibilityLabel("Share of expenses")
                        .accessibilityValue(row.share.formatted(.percent.precision(.fractionLength(0))))
                }
                .swipeActions {
                    if model.canManage, row.member.role != .owner {
                        Button("Remove", role: .destructive) { Task { await model.remove(row.member) } }
                        Button(row.member.role == .editor ? "Make viewer" : "Make editor") {
                            Task { await model.changeRole(of: row.member, to: row.member.role == .editor ? .viewer : .editor) }
                        }
                        .tint(.gray)
                    }
                }
            }
        } header: {
            SectionHeader(title: "Members")
        } footer: {
            Text("Expenses recorded by each member in this list.")
        }
    }

    private func entriesSection(currency: Currency) -> some View {
        Section {
            if model.entries.isEmpty {
                Text("No movements in this list yet.").foregroundStyle(Palette.muted)
            }
            ForEach(model.entries) { entry in
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(entry.description ?? String(localized: "Movement")).lineLimit(1)
                        Text("\(model.memberName(entry.userId)) · \(entry.transactionDate.iso)")
                            .font(Typography.caption)
                            .foregroundStyle(Palette.muted)
                    }
                    Spacer()
                    AmountText(value: entry.signedAmount, currency: currency)
                }
                .swipeActions {
                    if model.canRemove(entry) {
                        Button("Remove from list") { Task { await model.removeEntry(entry) } }
                    }
                }
            }
            if model.hasMoreEntries {
                ProgressView().frame(maxWidth: .infinity).task { await model.loadMoreEntries() }
            }
        } header: {
            SectionHeader(title: "Movements")
        }
    }

    private var invitesSection: some View {
        Section {
            ForEach(model.invites) { invite in
                HStack {
                    Text(RoleLabel.text(invite.role))
                    Spacer()
                    Text("Expires \(invite.expiresAt.formatted(.relative(presentation: .named)))")
                        .font(Typography.caption)
                        .foregroundStyle(Palette.muted)
                }
                .swipeActions {
                    Button("Revoke", role: .destructive) { Task { await model.revoke(invite) } }
                }
            }
        } header: {
            SectionHeader(title: "Pending invites")
        }
    }

    @ViewBuilder
    private var dangerSection: some View {
        if model.canManage {
            Section { Button("Delete list", role: .destructive) { confirmDelete = true } }
        } else if model.canLeave {
            Section { Button("Leave list", role: .destructive) { confirmLeave = true } }
        }
    }

    private func reload() {
        Task { await model.load() }
    }
}

/// Creates an invite and shows its code once, ready to share.
private struct InviteSheet: View {
    @Environment(\.dismiss) private var dismiss
    let model: ListDetailViewModel
    @State private var role: InviteRole = .viewer

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Role", selection: $role) {
                        Text("Viewer").tag(InviteRole.viewer)
                        Text("Editor").tag(InviteRole.editor)
                    }
                    .pickerStyle(.segmented)
                } footer: {
                    Text("Editors can add their movements; viewers can only see the list. Invites expire in 7 days and work once.")
                }

                if let token = model.createdInvite?.token {
                    Section("Invite code") {
                        Text(token)
                            .font(.body.monospaced())
                            .textSelection(.enabled)
                        ShareLink(item: token, message: Text("Join my list on Zentlet with this code")) {
                            Label("Share code", systemImage: "square.and.arrow.up")
                        }
                    }
                } else {
                    Section {
                        PrimaryButton(title: "Create invite") { Task { await model.createInvite(role: role) } }
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                    }
                }
            }
            .navigationTitle("Invite")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
    }
}

/// Pick own movements and move them into the list.
private struct AssignSheet: View {
    @Environment(\.dismiss) private var dismiss
    let model: ListDetailViewModel
    @State private var selection = Set<UUID>()

    var body: some View {
        NavigationStack {
            List(model.assignable, selection: $selection) { transaction in
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(transaction.description ?? String(localized: "Movement")).lineLimit(1)
                        Text(transaction.transactionDate.iso).font(Typography.caption).foregroundStyle(Palette.muted)
                    }
                    Spacer()
                    AmountText(value: transaction.signedAmount, currency: model.list?.currency ?? .default)
                }
            }
            .environment(\.editMode, .constant(.active))
            .overlay {
                if model.assignable.isEmpty {
                    ContentUnavailableView("Nothing to add", systemImage: "tray", description: Text("All your movements are already in this list."))
                }
            }
            .navigationTitle("Add movements")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add \(selection.count)") { Task { if await model.assign(selection) { dismiss() } } }
                        .disabled(selection.isEmpty || selection.count > 100)
                }
            }
            .task { await model.loadAssignable() }
        }
    }
}
