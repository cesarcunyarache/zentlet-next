import Foundation
import Observation

public enum UserMessage {
    /// Text safe to show the user for any thrown error.
    public static func from(_ error: Error) -> String {
        if let error = error as? AppError { return error.errorDescription ?? "" }
        return String(localized: "Something went wrong. Try again.")
    }
}

/// Who is signed in, and their preferences. Every signed-in screen reads it.
@MainActor
@Observable
public final class SessionViewModel {
    public enum State: Equatable {
        case restoring
        case signedOut
        case signedIn(User)
    }

    public private(set) var state: State = .restoring
    public private(set) var preference = UserPreference()
    public private(set) var isWorking = false
    public var errorMessage: String?

    private let auth: AuthRepository
    private let preferences: PreferenceRepository

    public init(auth: AuthRepository, preferences: PreferenceRepository) {
        self.auth = auth
        self.preferences = preferences
    }

    public var user: User? {
        if case .signedIn(let user) = state { return user }
        return nil
    }

    public func restore() async {
        do {
            guard let user = try await auth.currentUser() else {
                state = .signedOut
                return
            }
            preference = try await preferences.fetch()
            state = .signedIn(user)
        } catch {
            state = .signedOut
        }
    }

    public func signIn(email: String, password: String) async {
        await perform { try await self.auth.signIn(email: email, password: password) }
    }

    public func signUp(_ draft: SignUpDraft) async {
        await perform { try await self.auth.signUp(draft) }
    }

    public func signOut() async {
        try? await auth.signOut()
        state = .signedOut
    }

    public func completeOnboarding() async {
        try? await auth.completeOnboarding()
        if let user = try? await auth.currentUser() { state = .signedIn(user) }
    }

    /// Returns true when the account was deleted.
    public func deleteAccount(password: String) async -> Bool {
        isWorking = true
        defer { isWorking = false }
        do {
            try await auth.deleteAccount(password: password)
            state = .signedOut
            return true
        } catch {
            errorMessage = UserMessage.from(error)
            return false
        }
    }

    public func updatePreference(_ preference: UserPreference) async {
        do {
            self.preference = try await preferences.update(preference)
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }

    private func perform(_ operation: @escaping () async throws -> User) async {
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }
        do {
            let user = try await operation()
            preference = try await preferences.fetch()
            state = .signedIn(user)
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }
}
