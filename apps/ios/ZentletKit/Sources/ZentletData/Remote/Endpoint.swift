import Foundation
import ZentletCore

public enum HTTPMethod: String, Sendable {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

public struct Endpoint: Sendable {
    public let method: HTTPMethod
    public let path: String
    public var query: [URLQueryItem] = []
    public var body: Data?
    public var headers: [String: String] = [:]
    public var requiresAuthentication = true

    public static func get(_ path: String, query: [URLQueryItem] = []) -> Endpoint {
        Endpoint(method: .get, path: path, query: query.filter { $0.value != nil })
    }

    public static func delete(_ path: String) -> Endpoint {
        Endpoint(method: .delete, path: path)
    }

    public static func post(_ path: String) -> Endpoint {
        Endpoint(method: .post, path: path)
    }

    public static func send<Body: Encodable>(_ method: HTTPMethod, _ path: String, body: Body) throws -> Endpoint {
        Endpoint(method: method, path: path, body: try JSONCoding.encoder.encode(body))
    }
}

enum JSONCoding {
    static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    /// The web sends ISO datetimes with milliseconds (`toISOString()`); plain ISO 8601 is accepted too.
    static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let value = try container.decode(String.self)
            let withFraction = ISO8601DateFormatter()
            withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = withFraction.date(from: value) ?? ISO8601DateFormatter().date(from: value) { return date }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid ISO 8601 date: \(value)")
        }
        return decoder
    }()
}
