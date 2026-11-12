import Foundation
import Observation

@MainActor
@Observable
public final class CategoriesViewModel {
    public private(set) var categories: [Category] = []
    public private(set) var isLoading = false
    public var errorMessage: String?

    private let repository: CategoryRepository

    public init(repository: CategoryRepository) {
        self.repository = repository
    }

    public func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            categories = try await repository.fetchAll()
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }

    public func delete(_ category: Category) async {
        do {
            try await repository.delete(id: category.id)
            categories.removeAll { $0.id == category.id }
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }
}

@MainActor
@Observable
public final class CategoryFormViewModel {
    public static let palette = ["#94A3B8", "#F87171", "#FB923C", "#FACC15", "#4ADE80", "#2DD4BF", "#60A5FA", "#A78BFA", "#F472B6"]

    public var name: String
    public var icon: String
    public var color: String
    public var description: String
    public private(set) var isSaving = false
    public var errorMessage: String?

    public let editing: Category?
    private let repository: CategoryRepository

    public init(repository: CategoryRepository, editing: Category? = nil) {
        self.repository = repository
        self.editing = editing
        name = editing?.name ?? ""
        icon = editing?.icon ?? Category.fallbackIcon
        color = editing?.color ?? Self.palette[0]
        description = editing?.description ?? ""
    }

    /// The form asks for at least two characters (the API accepts one).
    public var canSave: Bool { name.trimmingCharacters(in: .whitespaces).count >= 2 && !isSaving }

    /// Returns the saved category, or nil when it failed (see `errorMessage`).
    public func save() async -> Category? {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        let draft = CategoryDraft(name: name, icon: icon, color: color, description: description)
        do {
            if let editing { return try await repository.update(id: editing.id, draft) }
            return try await repository.create(id: UUID(), draft)
        } catch {
            errorMessage = UserMessage.from(error)
            return nil
        }
    }
}
