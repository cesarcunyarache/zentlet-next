import Foundation
import ZentletCore

public protocol HTTPTransport: Sendable {
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}

extension URLSession: HTTPTransport {}

/// Thin URLSession wrapper: base URL, JSON, Bearer token and one error mapping for every endpoint.
public final class APIClient: Sendable {
    private let configuration: NetworkConfiguration
    private let transport: HTTPTransport
    private let tokenStore: TokenStore

    public init(configuration: NetworkConfiguration, tokenStore: TokenStore, transport: HTTPTransport = URLSession.shared) {
        self.configuration = configuration
        self.tokenStore = tokenStore
        self.transport = transport
    }

    public func send<Response: Decodable>(_ endpoint: Endpoint, as type: Response.Type = Response.self) async throws -> Response {
        let (data, _) = try await perform(endpoint)
        do {
            return try JSONCoding.decoder.decode(Response.self, from: data)
        } catch {
            throw AppError.decoding(String(describing: error))
        }
    }

    public func send(_ endpoint: Endpoint) async throws {
        _ = try await perform(endpoint)
    }

    /// Raw body, for file downloads.
    func download(_ endpoint: Endpoint) async throws -> (Data, HTTPURLResponse) {
        try await perform(endpoint)
    }

    /// Body and headers, for endpoints that return the session token in a header (`set-auth-token`).
    func sendWithHeaders<Response: Decodable>(_ endpoint: Endpoint, as type: Response.Type) async throws -> (Response, HTTPURLResponse) {
        let (data, response) = try await perform(endpoint)
        do {
            return (try JSONCoding.decoder.decode(Response.self, from: data), response)
        } catch {
            throw AppError.decoding(String(describing: error))
        }
    }

    private func perform(_ endpoint: Endpoint) async throws -> (Data, HTTPURLResponse) {
        let request = try makeRequest(for: endpoint)
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await transport.data(for: request)
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            throw AppError.network(error.localizedDescription)
        }

        guard let http = response as? HTTPURLResponse else { throw AppError.network("Invalid response") }
        guard (200..<300).contains(http.statusCode) else {
            let message = (try? JSONCoding.decoder.decode(APIErrorBody.self, from: data))?.message
            throw APIErrorMapping.error(status: http.statusCode, message: message)
        }
        return (data, http)
    }

    private func makeRequest(for endpoint: Endpoint) throws -> URLRequest {
        var components = URLComponents(url: configuration.baseURL.appending(path: endpoint.path), resolvingAgainstBaseURL: false)
        if !endpoint.query.isEmpty { components?.queryItems = endpoint.query }
        guard let url = components?.url else { throw AppError.network("Invalid URL: \(endpoint.path)") }

        var request = URLRequest(url: url, timeoutInterval: configuration.timeout)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body = endpoint.body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        for (name, value) in endpoint.headers { request.setValue(value, forHTTPHeaderField: name) }
        if endpoint.requiresAuthentication, let token = try tokenStore.readToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return request
    }
}

struct APIErrorBody: Decodable {
    let message: String?
    let code: String?
}

/// The web API answers `{ message }` with a human text, not a code. This table turns the documented
/// (status, message) pairs of `*.http-errors.ts` back into the shared `ErrorCode`s.
enum APIErrorMapping {
    private static let codes: [String: String] = [
        "Category id already in use": ErrorCode.idTaken,
        "Transaction id already in use": ErrorCode.idTaken,
        "List id already in use": ErrorCode.idTaken,
        "Category limit reached": ErrorCode.limitReached,
        "Category has transactions": ErrorCode.hasTransactions,
        "Category not found": ErrorCode.categoryNotFound,
        "Transaction not found": ErrorCode.transactionNotFound,
        "List currency differs from your account currency": ErrorCode.currencyMismatch,
        "Invite is invalid or expired": ErrorCode.inviteInvalid,
        "Member not found": ErrorCode.memberNotFound,
        "The owner cannot leave the list": ErrorCode.ownerCannotLeave,
        "Invalid cursor": "invalid_cursor",
        "Budget id already in use": ErrorCode.idTaken,
        "List not found": ErrorCode.listNotFound,
        "Category already has a budget in this list": ErrorCode.categoryHasBudget,
        "alerts: must be below the budget limit": ErrorCode.alertAboveLimit,
        "Invalid period start": ErrorCode.invalidPeriodStart,
        "Limit before budget start": ErrorCode.limitBeforeStart,
        "One-time budget has a single period": ErrorCode.singlePeriod,
    ]

    static func error(status: Int, message: String?) -> AppError {
        let code = message.flatMap { codes[$0] }
        switch status {
        case 401: return .unauthorized
        case 403: return .forbidden
        case 404: return code == ErrorCode.memberNotFound ? .validation(ErrorCode.memberNotFound) : .notFound
        case 409, 410: return .conflict(code ?? "conflict")
        case 400, 422: return .validation(code ?? "invalid_request", code == nil ? message : nil)
        default: return .server(status: status, message: message)
        }
    }
}
