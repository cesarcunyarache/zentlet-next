import Foundation
import SwiftData
import ZentletCore

public struct LocalPreferenceRepository: PreferenceRepository {
    private let store: LocalStore
    private let session: LocalSession

    public init(store: LocalStore, session: LocalSession) {
        self.store = store
        self.session = session
    }

    public func fetch() async throws -> UserPreference {
        let userId = try session.requireUserId()
        return try await store.perform { try $0.preference(for: userId).domain }
    }

    /// Existing shared lists keep their currency (as on the web): changing it may redirect later entries to the private list.
    public func update(_ preference: UserPreference) async throws -> UserPreference {
        let userId = try session.requireUserId()
        guard TimeZone(identifier: preference.timezone) != nil, preference.timezone.count <= 64 else {
            throw AppError.validation(ErrorCode.timezoneInvalid)
        }
        return try await store.perform { context in
            let entity = try context.preference(for: userId)
            entity.language = preference.language.rawValue
            entity.currency = preference.currency.rawValue
            entity.timezone = preference.timezone
            return entity.domain
        }
    }
}
