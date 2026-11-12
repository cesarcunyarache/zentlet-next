import PhotosUI
import SwiftUI
import UIKit
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
            editing: editing, defaultListId: defaultListId, recurring: dependencies.recurring,
            ai: dependencies.ai, language: session.preference.language
        ))
    }
}

private struct TransactionFormScreen: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(SessionViewModel.self) private var session
    @State private var model: TransactionFormViewModel
    @FocusState private var amountFocused: Bool
    @State private var isDictating = false
    @State private var receiptItem: PhotosPickerItem?
    @State private var isTakingPhoto = false
    @State private var suggestionTask: Task<Void, Never>?

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

                if model.editing == nil {
                    Section {
                        HStack(spacing: Spacing.sm) {
                            Button { isDictating = true } label: {
                                Label("Dictate", systemImage: "mic").frame(maxWidth: .infinity)
                            }
                            PhotosPicker(selection: $receiptItem, matching: .images) {
                                Label("Receipt", systemImage: "doc.text.viewfinder").frame(maxWidth: .infinity)
                            }
                            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                                Button { isTakingPhoto = true } label: {
                                    Label("Camera", systemImage: "camera").frame(maxWidth: .infinity)
                                }
                            }
                        }
                        .buttonStyle(.bordered)
                        .labelStyle(.iconOnly)
                        .disabled(model.categories.isEmpty || model.isScanning)
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets())
                        if model.isScanning {
                            HStack { ProgressView(); Text("Reading receipt…").foregroundStyle(Palette.muted) }
                                .listRowBackground(Color.clear)
                        }
                    }
                }

                Section {
                    Picker("Category", selection: Binding(get: { model.categoryId }, set: { model.pickCategory($0) })) {
                        ForEach(model.categories) { category in
                            Text("\(category.icon) \(category.name)").tag(UUID?.some(category.id))
                        }
                    }
                    DatePicker("Date", selection: dateBinding, displayedComponents: .date)
                        .environment(\.timeZone, TimeZone(identifier: "UTC")!)
                    TextField("Description", text: $model.description)
                        .onChange(of: model.description) { scheduleSuggestion() }
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
            .sheet(isPresented: $isDictating) {
                VoiceEntrySheet { transcript in
                    Task { await model.apply(transcript: transcript, today: today) }
                }
            }
            .fullScreenCover(isPresented: $isTakingPhoto) {
                CameraPicker { image in
                    guard let data = ReceiptImage.jpeg(from: image) else { return }
                    Task { await model.scanReceipt(data, mimeType: "image/jpeg", today: today) }
                }
                .ignoresSafeArea()
            }
            .onChange(of: receiptItem) {
                guard let item = receiptItem else { return }
                receiptItem = nil
                Task {
                    guard let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data),
                          let jpeg = ReceiptImage.jpeg(from: image) else { return }
                    await model.scanReceipt(jpeg, mimeType: "image/jpeg", today: today)
                }
            }
            .errorAlert($model.errorMessage)
        }
        .presentationDragIndicator(.visible)
    }

    private var today: CalendarDay { CalendarDay.today(in: session.preference.timeZone) }

    /// Waits for typing to pause, then asks for a category suggestion.
    private func scheduleSuggestion() {
        suggestionTask?.cancel()
        suggestionTask = Task {
            try? await Task.sleep(for: .milliseconds(600))
            guard !Task.isCancelled else { return }
            await model.suggestFromDescription()
        }
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

/// Receipt photos go out as JPEG under the 900 KB limit of the scanner.
enum ReceiptImage {
    static func jpeg(from image: UIImage) -> Data? {
        let maxSide: CGFloat = 1600
        let scale = min(1, maxSide / max(image.size.width, image.size.height))
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let resized = UIGraphicsImageRenderer(size: size).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
        for quality in stride(from: 0.8, through: 0.3, by: -0.1) {
            if let data = resized.jpegData(compressionQuality: quality), data.count <= AILimits.maxReceiptBytes { return data }
        }
        return nil
    }
}

/// System camera for photographing a receipt.
struct CameraPicker: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    let onImage: (UIImage) -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ controller: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker

        init(parent: CameraPicker) {
            self.parent = parent
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage { parent.onImage(image) }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}
