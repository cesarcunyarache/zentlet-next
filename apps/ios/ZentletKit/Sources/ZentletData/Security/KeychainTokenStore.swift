import Foundation
import Security
import ZentletCore

public protocol TokenStore: Sendable {
    func readToken() throws -> String?
    func saveToken(_ token: String) throws
    func deleteToken() throws
}

public struct KeychainTokenStore: TokenStore {
    private let service: String
    private let account: String

    public init(account: String, service: String = Bundle.main.bundleIdentifier ?? "zentlet") {
        self.service = service
        self.account = account
    }

    public func readToken() throws -> String? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = item as? Data else {
            throw AppError.persistence("Keychain read failed: \(status)")
        }
        return String(data: data, encoding: .utf8)
    }

    public func saveToken(_ token: String) throws {
        try deleteToken()
        var query = baseQuery
        query[kSecValueData as String] = Data(token.utf8)
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else { throw AppError.persistence("Keychain write failed: \(status)") }
    }

    public func deleteToken() throws {
        let status = SecItemDelete(baseQuery as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw AppError.persistence("Keychain delete failed: \(status)")
        }
    }

    private var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }
}

/// For tests and previews.
public final class InMemoryTokenStore: TokenStore, @unchecked Sendable {
    private let lock = NSLock()
    private var token: String?

    public init(token: String? = nil) {
        self.token = token
    }

    public func readToken() throws -> String? { lock.withLock { token } }
    public func saveToken(_ token: String) throws { lock.withLock { self.token = token } }
    public func deleteToken() throws { lock.withLock { token = nil } }
}
