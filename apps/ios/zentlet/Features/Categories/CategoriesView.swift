import SwiftUI
import ZentletCore

struct CategoriesView: View {
    var body: some View {
        WithDependencies { dependencies in
            CategoriesScreen(model: CategoriesViewModel(repository: dependencies.categories))
        }
    }
}

private struct CategoriesScreen: View {
    @State private var model: CategoriesViewModel
    @State private var isCreating = false
    @State private var editing: ZentletCore.Category?
    @State private var pendingDelete: ZentletCore.Category?

    init(model: CategoriesViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        List {
            ForEach(model.categories) { category in
                Button { editing = category } label: {
                    HStack(spacing: Spacing.md) {
                        IconBadge(icon: category.icon, color: category.color)
                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            Text(category.name)
                            if let description = category.description {
                                Text(description)
                                    .font(Typography.caption)
                                    .foregroundStyle(Palette.muted)
                                    .lineLimit(1)
                            }
                        }
                    }
                }
                .buttonStyle(.plain)
                .swipeActions {
                    Button("Delete", systemImage: "trash", role: .destructive) { pendingDelete = category }
                }
            }
        }
        .overlay {
            if model.categories.isEmpty, !model.isLoading {
                ContentUnavailableView {
                    Label("No categories", systemImage: "square.grid.2x2")
                } description: {
                    Text("Categories group your movements.")
                } actions: {
                    Button("Create category") { isCreating = true }
                }
            }
        }
        .navigationTitle("Categories")
        .toolbar {
            Button("New category", systemImage: "plus") { isCreating = true }
                .disabled(model.categories.count >= CategoryDraft.maxCategoriesPerUser)
        }
        .task { await model.load() }
        .sheet(isPresented: $isCreating, onDismiss: reload) { CategoryFormView(editing: nil) }
        .sheet(item: $editing, onDismiss: reload) { CategoryFormView(editing: $0) }
        .confirmationDialog(
            "Delete \(pendingDelete?.name ?? "")?", isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } }),
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                if let category = pendingDelete { Task { await model.delete(category) } }
            }
        } message: {
            Text("Categories with movements can't be deleted.")
        }
        .errorAlert($model.errorMessage)
    }

    private func reload() {
        Task { await model.load() }
    }
}

struct CategoryFormView: View {
    let editing: ZentletCore.Category?

    var body: some View {
        WithDependencies { dependencies in
            CategoryFormScreen(model: CategoryFormViewModel(repository: dependencies.categories, editing: editing))
        }
    }
}

private struct CategoryFormScreen: View {
    @Environment(\.dismiss) private var dismiss
    @State private var model: CategoryFormViewModel
    @State private var isCreatingBudget = false

    init(model: CategoryFormViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Spacer()
                        IconBadge(icon: model.icon, color: model.color, size: 72)
                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                }
                Section {
                    TextField("Name", text: $model.name)
                    EmojiField(icon: $model.icon)
                    ColorRow(selection: $model.color)
                }
                Section("Description") {
                    TextField("Optional", text: $model.description, axis: .vertical)
                        .lineLimit(2...4)
                }
            }
            .navigationTitle(model.editing == nil ? "New category" : "Edit category")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                if model.editing != nil {
                    ToolbarItem(placement: .primaryAction) {
                        Button("Create budget", systemImage: "gauge.with.dots.needle.33percent") { isCreatingBudget = true }
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { if await model.save() != nil { dismiss() } } }
                        .disabled(!model.canSave)
                }
            }
            .sheet(isPresented: $isCreatingBudget) { BudgetFormView(categoryId: model.editing?.id, listId: nil) }
            .errorAlert($model.errorMessage)
        }
    }
}

/// One emoji as the icon; typing replaces the current one.
struct EmojiField: View {
    @Binding var icon: String

    var body: some View {
        LabeledContent("Icon") {
            TextField("Emoji", text: Binding(
                get: { icon },
                set: { value in icon = value.last.map(String.init) ?? "" }
            ))
            .multilineTextAlignment(.trailing)
        }
    }
}

struct ColorRow: View {
    @Binding var selection: String

    var body: some View {
        HStack(spacing: Spacing.sm) {
            ForEach(CategoryFormViewModel.palette, id: \.self) { hex in
                Circle()
                    .fill(Color(hex: hex))
                    .frame(width: 28, height: 28)
                    .overlay { Circle().stroke(Palette.foreground, lineWidth: selection == hex ? 2 : 0).padding(-3) }
                    .onTapGesture { selection = hex }
                    .accessibilityLabel(hex)
                    .accessibilityAddTraits(selection == hex ? .isSelected : [])
            }
        }
        .frame(maxWidth: .infinity)
    }
}
