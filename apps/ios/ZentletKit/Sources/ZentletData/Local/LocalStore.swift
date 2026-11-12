import Foundation
import SwiftData
import ZentletCore

/// Serializes every SwiftData access on one background context. A unit of work either saves entirely or rolls back.
public actor LocalStore: ModelActor {
    public nonisolated let modelContainer: ModelContainer
    public nonisolated let modelExecutor: any ModelExecutor

    public init(container: ModelContainer) {
        let context = ModelContext(container)
        context.autosaveEnabled = false
        modelContainer = container
        modelExecutor = DefaultSerialModelExecutor(modelContext: context)
    }

    func perform<T: Sendable>(_ work: @Sendable (ModelContext) throws -> T) throws -> T {
        do {
            let result = try work(modelContext)
            if modelContext.hasChanges { try modelContext.save() }
            return result
        } catch {
            modelContext.rollback()
            if error is AppError { throw error }
            throw AppError.persistence(String(describing: error))
        }
    }
}

/// Who is calling: the locally signed-in user, the local equivalent of a session cookie.
public struct LocalSession: Sendable {
    private let store: TokenStore

    public init(store: TokenStore) {
        self.store = store
    }

    func currentUserId() throws -> UUID? {
        try store.readToken().flatMap(UUID.init(uuidString:))
    }

    func requireUserId() throws -> UUID {
        guard let id = try currentUserId() else { throw AppError.unauthorized }
        return id
    }

    func start(userId: UUID) throws { try store.saveToken(userId.uuidString) }

    func end() throws { try store.deleteToken() }
}
