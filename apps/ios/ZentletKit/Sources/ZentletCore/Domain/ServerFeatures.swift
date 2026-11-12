import Foundation

// MARK: - AI

/// Mirrors the web `suggestTransactionCategory` output.
public struct CategorySuggestion: Hashable, Sendable {
    public let categoryId: UUID?
    public let type: TransactionType

    public init(categoryId: UUID?, type: TransactionType) {
        self.categoryId = categoryId
        self.type = type
    }
}

/// One icon/color option for a new category (web `generateCategory`).
public struct CategoryStyle: Hashable, Sendable {
    public let icon: String
    public let color: String

    public init(icon: String, color: String) {
        self.icon = icon
        self.color = color
    }
}

/// Mirrors the web receipt `extraction`.
public struct ReceiptExtraction: Hashable, Sendable {
    public let amount: Decimal?
    public let currency: String?
    public let date: CalendarDay?
    public let summary: String
    public let description: String
    public let categoryId: UUID?
    public let type: TransactionType

    public init(
        amount: Decimal?, currency: String?, date: CalendarDay?, summary: String, description: String,
        categoryId: UUID?, type: TransactionType
    ) {
        self.amount = amount
        self.currency = currency
        self.date = date
        self.summary = summary
        self.description = description
        self.categoryId = categoryId
        self.type = type
    }
}

public enum ReceiptScanError: String, Error, Sendable {
    case notReceipt = "not_receipt"
    case invalidImage = "invalid_image"
    case limited
    case failed
}

public enum AILimits {
    /// Same input limits as the web schemas.
    public static let minDescriptionLength = 3
    public static let maxDescriptionLength = 80
    public static let maxPromptLength = 60
    public static let maxReceiptBytes = 900_000
}

// MARK: - Inbox (bank emails)

public struct InboxItem: Identifiable, Hashable, Sendable {
    public let id: UUID
    public let bank: String?
    public let senderAddress: String
    public let subject: String
    public let isVerified: Bool
    public let isNewSender: Bool
    public let type: TransactionType
    public let amount: Decimal?
    public let currency: String?
    public let merchant: String?
    public let description: String
    public let categoryId: UUID?
    public let transactionDate: CalendarDay
    public let cardLast4: String?
    public let duplicateOfId: UUID?
    public let receivedAt: Date

    public init(
        id: UUID, bank: String?, senderAddress: String, subject: String, isVerified: Bool, isNewSender: Bool,
        type: TransactionType, amount: Decimal?, currency: String?, merchant: String?, description: String,
        categoryId: UUID?, transactionDate: CalendarDay, cardLast4: String?, duplicateOfId: UUID?, receivedAt: Date
    ) {
        self.id = id
        self.bank = bank
        self.senderAddress = senderAddress
        self.subject = subject
        self.isVerified = isVerified
        self.isNewSender = isNewSender
        self.type = type
        self.amount = amount
        self.currency = currency
        self.merchant = merchant
        self.description = description
        self.categoryId = categoryId
        self.transactionDate = transactionDate
        self.cardLast4 = cardLast4
        self.duplicateOfId = duplicateOfId
        self.receivedAt = receivedAt
    }
}

public struct InboxSender: Identifiable, Hashable, Sendable {
    public enum Status: String, Sendable { case trusted, blocked }

    public let id: UUID
    public let address: String
    public let status: Status
    public let isLearned: Bool
    public let acceptedCount: Int

    public init(id: UUID, address: String, status: Status, isLearned: Bool, acceptedCount: Int) {
        self.id = id
        self.address = address
        self.status = status
        self.isLearned = isLearned
        self.acceptedCount = acceptedCount
    }
}

public struct InboxConnection: Hashable, Sendable {
    public let isAvailable: Bool
    /// Forwarding address bank emails can be sent to.
    public let address: String?
    public let verificationCode: String?
    public let verificationURL: URL?
    public let lastReceivedAt: Date?
    public let senders: [InboxSender]
    public let gmailAvailable: Bool
    public let gmailEmail: String?
    public let gmailActive: Bool

    public init(
        isAvailable: Bool, address: String?, verificationCode: String?, verificationURL: URL?, lastReceivedAt: Date?,
        senders: [InboxSender], gmailAvailable: Bool, gmailEmail: String?, gmailActive: Bool
    ) {
        self.isAvailable = isAvailable
        self.address = address
        self.verificationCode = verificationCode
        self.verificationURL = verificationURL
        self.lastReceivedAt = lastReceivedAt
        self.senders = senders
        self.gmailAvailable = gmailAvailable
        self.gmailEmail = gmailEmail
        self.gmailActive = gmailActive
    }

    public static let unavailable = InboxConnection(
        isAvailable: false, address: nil, verificationCode: nil, verificationURL: nil, lastReceivedAt: nil, senders: [],
        gmailAvailable: false, gmailEmail: nil, gmailActive: false
    )
}

/// Result of the Gmail browser flow, read from `?gmail=` on the return URL.
public enum GmailConnectResult: String, Sendable {
    case connected, cancelled, scopeDenied = "scope_denied", taken, unavailable, error
}

// MARK: - WhatsApp

public struct WhatsAppConnection: Hashable, Sendable {
    public let isAvailable: Bool
    public let phone: String?
    public let linkedAt: Date?

    public init(isAvailable: Bool, phone: String?, linkedAt: Date?) {
        self.isAvailable = isAvailable
        self.phone = phone
        self.linkedAt = linkedAt
    }

    public static let unavailable = WhatsAppConnection(isAvailable: false, phone: nil, linkedAt: nil)
}

/// Send "vincular XXXX-XXXX" from WhatsApp through `url` within 10 minutes to link the phone.
public struct WhatsAppLinkCode: Hashable, Sendable {
    public let code: String
    public let url: URL
    public let expiresAt: Date

    public init(code: String, url: URL, expiresAt: Date) {
        self.code = code
        self.url = url
        self.expiresAt = expiresAt
    }
}

// MARK: - Billing

public enum SubscriptionStatus: String, Sendable {
    case pending, trialing, active, pastDue = "past_due", canceled
}

public struct BillingSummary: Hashable, Sendable {
    public let plan: String
    public let features: [String]
    public let status: SubscriptionStatus?
    public let trialEndsAt: Date?
    public let currentPeriodEnd: Date?
    public let isTrialEligible: Bool
    public let hasPendingCheckout: Bool
    public let price: Decimal
    public let currency: String
    public let interval: String

    public init(
        plan: String, features: [String], status: SubscriptionStatus?, trialEndsAt: Date?, currentPeriodEnd: Date?,
        isTrialEligible: Bool, hasPendingCheckout: Bool, price: Decimal, currency: String, interval: String
    ) {
        self.plan = plan
        self.features = features
        self.status = status
        self.trialEndsAt = trialEndsAt
        self.currentPeriodEnd = currentPeriodEnd
        self.isTrialEligible = isTrialEligible
        self.hasPendingCheckout = hasPendingCheckout
        self.price = price
        self.currency = currency
        self.interval = interval
    }

    public var isPaid: Bool { plan != "free" && (status == .active || status == .trialing) }
}
