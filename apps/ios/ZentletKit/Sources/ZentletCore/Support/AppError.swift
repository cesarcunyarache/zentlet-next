import Foundation

public enum AppError: Error, Equatable, Sendable {
    case validation(String, String? = nil)
    case notFound
    case forbidden
    case unauthorized
    case conflict(String)
    case network(String)
    case server(status: Int, message: String?)
    case decoding(String)
    case persistence(String)
    case notImplemented(String)
}

extension AppError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .validation(let code, let message): return message ?? ValidationMessages.text(for: code)
        case .notFound: return String(localized: "The item no longer exists.")
        case .forbidden: return String(localized: "You don't have permission to do this.")
        case .unauthorized: return String(localized: "Your session has expired. Sign in again.")
        case .conflict(let code): return ValidationMessages.text(for: code)
        case .network: return String(localized: "Can't connect. Check your connection and try again.")
        case .server: return String(localized: "Something went wrong. Try again later.")
        case .decoding: return String(localized: "Unexpected response from the server.")
        case .persistence: return String(localized: "Couldn't save your data on this device.")
        case .notImplemented(let feature): return String(localized: "\(feature) is not available yet.")
        }
    }
}
