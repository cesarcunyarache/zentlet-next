import SwiftUI
import ZentletCore

struct TransactionFormView: View {
    let editing: Transaction?
    let defaultListId: UUID?

    var body: some View {
        WithDependencies { dependencies in
            TransactionFormLoader(dependencies: dependencies, editing: editing, defaultListId: defaultListId)
        }
    }
}

private struct TransactionFormLoader: View {
    @Environment(SessionViewModel.self) private var session
    let dependencies: AppDependencies
    let editing: Transaction?
    let defaultListId: UUID?

    var body: some View {
        TransactionFormScreen(model: TransactionFormViewModel(
            transactions: dependencies.transactions, categories: dependencies.categories, lists: dependencies.lists,
            accountCurrency: session.preference.currency,
            today: CalendarDay.today(in: session.preference.timeZone, now: dependencies.clock()),
            editing: editing, defaultListId: defaultListId, recurring: dependencies.recurring
        ))
    }
}

private struct TransactionFormScreen: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(SessionViewModel.self) private var session
    @State private var model: TransactionFormViewModel
    @FocusState private var amountFocused: Bool

    init(model: TransactionFormViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Type", selection: $model.type) {
                        Text("Expense").tag(TransactionType.expense)
                        Text("Income").tag(TransactionType.income)
                    }
                    .pickerStyle(.segmented)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())

                    HStack(alignment: .firstTextBaseline, spacing: Spacing.sm) {
                        Text(session.preference.currency.symbol)
                            .font(.title2)
                            .foregroundStyle(Palette.muted)
                        TextField("0.00", text: $model.amountText)
                            .font(Typography.amountHero)
                            .keyboardType(.decimalPad)
                            .focused($amountFocused)
                            .accessibilityLabel("Amount")
                    }
                    .listRowBackground(Color.clear)
                }

                Section {
                    Picker("Category", selection: $model.categoryId) {
                        ForEach(model.categories) { category in
                            Text("\(category.icon) \(category.name)").tag(UUID?.some(category.id))
                        }
                    }
                    DatePicker("Date", selection: dateBinding, displayedComponents: .date)
                        .environment(\.timeZone, TimeZone(identifier: "UTC")!)
                    TextField("Description", text: $model.description)
                    if model.description.count > TransactionFormViewModel.descriptionMaxLength {
                        Text("Up to \(TransactionFormViewModel.descriptionMaxLength) characters.")
                            .font(Typography.caption)
                            .foregroundStyle(Palette.destructive)
                    }
                    TextField("Reference (optional)", text: $model.reference)
                }

                if model.editing == nil {
                    Section {
                        Picker("Repeat", selection: $model.recurrence) {
                            Text("Never").tag(RecurrenceFrequency?.none)
                            ForEach(RecurrenceFrequency.allCases, id: \.self) { Text(RecurrenceLabel.text($0)).tag(RecurrenceFrequency?.some($0)) }
                        }
                    } footer: {
                        if model.recurrence != nil {
                            Text("Repeats on the same day and is always saved in your private list.")
                        }
                    }
                }

                if let series = model.series {
                    Section {
                        LabeledContent("Repeats", value: RecurrenceLabel.text(series.frequency))
                        LabeledContent("Next", value: series.nextDueDate.relativeTitle(today: CalendarDay.today(in: session.preference.timeZone)))
                        Button("Stop repeating", role: .destructive) { Task { await model.stopSeries() } }
                    } footer: {
                        Text("Movements already created stay.")
                    }
                }

                if model.editing == nil, model.recurrence == nil, model.lists.count > 1 {
                    Section {
                        Picker("List", selection: $model.listId) {
                            ForEach(model.lists) { list in
                                Text("\(list.icon) \(list.name)").tag(UUID?.some(list.id))
                            }
                        }
                    } footer: {
                        Text("Shared lists only accept movements in their currency.")
                    }
                }
            }
            .navigationTitle(model.editing == nil ? "New movement" : "Edit movement")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { if await model.save() != nil { dismiss() } }
                    }
                    .disabled(!model.canSave)
                }
            }
            .overlay {
                if model.categories.isEmpty {
                    ContentUnavailableView("No categories", systemImage: "square.grid.2x2", description: Text("Create a category in Settings first."))
                }
            }
            .task {
                await model.load()
                if model.editing == nil { amountFocused = true }
            }
            .errorAlert($model.errorMessage)
        }
        .presentationDragIndicator(.visible)
    }

    private var dateBinding: Binding<Date> {
        Binding(
            get: { model.date.date },
            set: { model.date = CalendarDay(date: $0, timeZone: TimeZone(identifier: "UTC")!) }
        )
    }
}

enum RecurrenceLabel {
    static func text(_ frequency: RecurrenceFrequency) -> String {
        switch frequency {
        case .weekly: String(localized: "Every week")
        case .monthly: String(localized: "Every month")
        case .quarterly: String(localized: "Every 3 months")
        case .semiannual: String(localized: "Every 6 months")
        case .annual: String(localized: "Every year")
        }
    }
}
