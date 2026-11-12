import Foundation
import Observation

/// Bank emails waiting to become movements, plus the import settings (forwarding address, senders, Gmail).
@MainActor
@Observable
public final class InboxViewModel {
    public private(set) var items: [InboxItem] = []
    public private(set) var connection: InboxConnection = .unavailable
    public private(set) var categories: [UUID: Category] = [:]
    public private(set) var isLoading = false
    public var errorMessage: String?
    public var newSender = ""

    private let dependencies: AppDependencies

    public init(dependencies: AppDependencies) {
        self.dependencies = dependencies
    }

    public var isAvailable: Bool { dependencies.hasServer && connection.isAvailable }

    public func load() async {
        isLoading = true
        defer { isLoading = false }
        await run {
            self.connection = try await self.dependencies.inbox.connection()
            self.items = self.connection.isAvailable ? try await self.dependencies.inbox.items() : []
            self.categories = Dictionary(uniqueKeysWithValues: try await self.dependencies.categories.fetchAll().map { ($0.id, $0) })
        }
    }

    public func createForwardingAddress() async {
        await run { self.connection = try await self.dependencies.inbox.createForwardingAddress() }
    }

    public func gmailConnectURL() async -> URL? {
        var url: URL?
        await run { url = try await self.dependencies.inbox.gmailConnectURL() }
        return url
    }

    /// Reads `?gmail=<result>` from the URL the browser returned to.
    public func finishGmailConnect(callback: URL) async -> GmailConnectResult {
        let value = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems?.first { $0.name == "gmail" }?.value
        let result = value.flatMap(GmailConnectResult.init(rawValue:)) ?? .error
        await load()
        return result
    }

    public func disconnectGmail() async {
        await run { self.connection = try await self.dependencies.inbox.disconnectGmail() }
    }

    public func addSender() async {
        let address = newSender
        await run {
            _ = try await self.dependencies.inbox.addSender(address: address)
            self.newSender = ""
            self.connection = try await self.dependencies.inbox.connection()
        }
    }

    public func removeSender(_ sender: InboxSender) async {
        await run {
            try await self.dependencies.inbox.removeSender(id: sender.id)
            self.connection = try await self.dependencies.inbox.connection()
        }
    }

    /// Turns the email into a movement, with the user's edits.
    public func accept(_ item: InboxItem, draft: TransactionDraft) async -> Bool {
        var accepted = false
        await run {
            _ = try await self.dependencies.inbox.accept(itemId: item.id, draft)
            self.items.removeAll { $0.id == item.id }
            accepted = true
        }
        return accepted
    }

    public func dismiss(_ item: InboxItem) async {
        await run {
            try await self.dependencies.inbox.dismiss(itemId: item.id)
            self.items.removeAll { $0.id == item.id }
        }
    }

    private func run(_ operation: @escaping () async throws -> Void) async {
        errorMessage = nil
        do {
            try await operation()
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }
}

@MainActor
@Observable
public final class WhatsAppViewModel {
    public private(set) var connection: WhatsAppConnection = .unavailable
    public private(set) var linkCode: WhatsAppLinkCode?
    public var errorMessage: String?

    private let dependencies: AppDependencies

    public init(dependencies: AppDependencies) {
        self.dependencies = dependencies
    }

    public var isAvailable: Bool { dependencies.hasServer && connection.isAvailable }
    public var isLinked: Bool { connection.phone != nil }

    public func load() async {
        do {
            connection = try await dependencies.whatsApp.connection()
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }

    /// The code to send from WhatsApp; it lasts 10 minutes.
    public func startLinking() async -> URL? {
        do {
            let code = try await dependencies.whatsApp.createLinkCode()
            linkCode = code
            return code.url
        } catch {
            errorMessage = UserMessage.from(error)
            return nil
        }
    }

    public func unlink() async {
        do {
            connection = try await dependencies.whatsApp.unlink()
            linkCode = nil
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }
}

@MainActor
@Observable
public final class BillingViewModel {
    public static let paidPlan = "pro"

    public private(set) var summary: BillingSummary?
    public private(set) var isWorking = false
    public var errorMessage: String?

    private let dependencies: AppDependencies

    public init(dependencies: AppDependencies) {
        self.dependencies = dependencies
    }

    public var hasServer: Bool { dependencies.hasServer }

    public func load() async {
        await run { self.summary = try await self.dependencies.billing.summary() }
    }

    public func checkoutURL() async -> URL? {
        var url: URL?
        await run { url = try await self.dependencies.billing.checkout(plan: Self.paidPlan) }
        return url
    }

    /// After coming back from the payment page.
    public func sync() async {
        await run { self.summary = try await self.dependencies.billing.sync() }
    }

    public func cancel() async {
        await run { self.summary = try await self.dependencies.billing.cancel() }
    }

    private func run(_ operation: @escaping () async throws -> Void) async {
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }
        do {
            try await operation()
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }
}

extension CategoryFormViewModel {
    /// Icon and color ideas for the current name (AI on the server, keyword table on the device).
    public func styleIdeas(using ai: AIRepository) async -> [CategoryStyle] {
        (try? await ai.categoryStyles(for: name)) ?? []
    }

    public func apply(_ style: CategoryStyle) {
        icon = style.icon
        color = style.color
    }
}
