import Foundation
import Vision
import ZentletCore

/// AI on the device: rules for categories and Vision text recognition for receipts. No data leaves the phone.
public struct LocalAIRepository: AIRepository {
    public init() {}

    public func suggestCategory(description: String, categories: [ZentletCore.Category], language: AppLanguage) async throws -> CategorySuggestion? {
        OnDeviceAssistant.suggestCategory(description: description, categories: categories, language: language)
    }

    public func categoryStyles(for prompt: String) async throws -> [CategoryStyle] {
        OnDeviceAssistant.categoryStyles(for: prompt)
    }

    public func scanReceipt(image: Data, mimeType: String, categories: [ZentletCore.Category], today: CalendarDay) async throws -> ReceiptExtraction {
        let lines = try await Self.recognizeText(in: image)
        return try ReceiptTextParser.parse(lines: lines, categories: categories, language: .es, today: today)
    }

    private static func recognizeText(in image: Data) async throws -> [String] {
        try await withCheckedThrowingContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                if error != nil {
                    continuation.resume(throwing: ReceiptScanError.failed)
                    return
                }
                let lines = (request.results as? [VNRecognizedTextObservation] ?? []).compactMap { $0.topCandidates(1).first?.string }
                continuation.resume(returning: lines)
            }
            request.recognitionLevel = .accurate
            request.recognitionLanguages = ["es-ES", "en-US"]
            request.usesLanguageCorrection = true
            do {
                try VNImageRequestHandler(data: image).perform([request])
            } catch {
                continuation.resume(throwing: ReceiptScanError.invalidImage)
            }
        }
    }
}

/// Bank-email import needs the server's mail pipeline; locally it reports itself unavailable.
public struct LocalInboxRepository: InboxRepository {
    public init() {}

    public func items() async throws -> [InboxItem] { [] }
    public func connection() async throws -> InboxConnection { .unavailable }
    public func createForwardingAddress() async throws -> InboxConnection { throw AppError.notImplemented("Email import") }
    public func gmailConnectURL() async throws -> URL { throw AppError.notImplemented("Gmail") }
    public func disconnectGmail() async throws -> InboxConnection { .unavailable }
    public func addSender(address: String) async throws -> InboxSender { throw AppError.notImplemented("Email import") }
    public func removeSender(id: UUID) async throws { throw AppError.notImplemented("Email import") }
    public func accept(itemId: UUID, _ draft: TransactionDraft) async throws -> Transaction { throw AppError.notFound }
    public func dismiss(itemId: UUID) async throws { throw AppError.notFound }
}

/// WhatsApp needs the server's webhook; locally it reports itself unavailable.
public struct LocalWhatsAppRepository: WhatsAppRepository {
    public init() {}

    public func connection() async throws -> WhatsAppConnection { .unavailable }
    public func createLinkCode() async throws -> WhatsAppLinkCode { throw AppError.notImplemented("WhatsApp") }
    public func unlink() async throws -> WhatsAppConnection { .unavailable }
}

/// Every feature is free while billing is off; there is nothing to buy locally.
public struct LocalBillingRepository: BillingRepository {
    public init() {}

    private static let free = BillingSummary(
        plan: "free", features: [], status: nil, trialEndsAt: nil, currentPeriodEnd: nil, isTrialEligible: false,
        hasPendingCheckout: false, price: 0, currency: Currency.default.rawValue, interval: "month"
    )

    public func summary() async throws -> BillingSummary { Self.free }
    public func checkout(plan: String) async throws -> URL { throw AppError.notImplemented("Subscriptions") }
    public func sync() async throws -> BillingSummary { Self.free }
    public func cancel() async throws -> BillingSummary { Self.free }
}
