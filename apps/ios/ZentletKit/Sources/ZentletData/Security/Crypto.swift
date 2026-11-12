import CommonCrypto
import CryptoKit
import Foundation

/// Salted PBKDF2-SHA256 for local development accounts. Passwords are never stored in plain text.
enum PasswordHasher {
    static let defaultIterations = 210_000
    private static let keyLength = 32

    static func makeSalt() -> Data { RandomBytes.make(count: 16) }

    static func hash(_ password: String, salt: Data, iterations: Int) -> Data {
        var derived = [UInt8](repeating: 0, count: keyLength)
        let saltBytes = [UInt8](salt)
        let status = CCKeyDerivationPBKDF(
            CCPBKDFAlgorithm(kCCPBKDF2), password, password.utf8.count, saltBytes, saltBytes.count,
            CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256), UInt32(iterations), &derived, keyLength
        )
        precondition(status == kCCSuccess, "PBKDF2 failed: \(status)")
        return Data(derived)
    }

    static func verify(_ password: String, hash expected: Data, salt: Data, iterations: Int) -> Bool {
        let actual = hash(password, salt: salt, iterations: iterations)
        guard actual.count == expected.count else { return false }
        return zip(actual, expected).reduce(UInt8(0)) { $0 | ($1.0 ^ $1.1) } == 0
    }
}

enum RandomBytes {
    static func make(count: Int) -> Data {
        var bytes = [UInt8](repeating: 0, count: count)
        let status = SecRandomCopyBytes(kSecRandomDefault, count, &bytes)
        precondition(status == errSecSuccess, "SecRandomCopyBytes failed: \(status)")
        return Data(bytes)
    }
}

/// Invite secrets: 24 random bytes in base64url; only their SHA-256 is stored (same scheme as the web).
enum InviteToken {
    static func make() -> String { RandomBytes.make(count: 24).base64URLEncoded }

    static func hash(_ token: String) -> String { Data(SHA256.hash(data: Data(token.utf8))).base64URLEncoded }
}

extension Data {
    var base64URLEncoded: String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
