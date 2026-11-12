import Foundation

/// Input validated with the same limits as the web API schemas. Both data sources receive only valid drafts.
public struct CategoryDraft: Hashable, Sendable {
    public var name: String
    public var icon: String
    public var color: String
    public var description: String?

    public static let nameLimit = 1...60
    public static let iconMaxLength = 16
    public static let colorMaxLength = 32
    public static let descriptionMaxLength = 200
    public static let maxCategoriesPerUser = 200

    public init(name: String, icon: String, color: String, description: String? = nil) {
        self.name = name
        self.icon = icon
        self.color = color
        self.description = description
    }

    public func validated() throws -> CategoryDraft {
        let name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { throw AppError.validation(ErrorCode.nameRequired) }
        guard name.count <= Self.nameLimit.upperBound else { throw AppError.validation(ErrorCode.nameTooLong) }
        guard (1...Self.iconMaxLength).contains(icon.count) else { throw AppError.validation(ErrorCode.iconInvalid) }
        guard (1...Self.colorMaxLength).contains(color.count) else { throw AppError.validation(ErrorCode.colorInvalid) }
        let description = description.normalizedOptional
        guard (description?.count ?? 0) <= Self.descriptionMaxLength else {
            throw AppError.validation(ErrorCode.descriptionTooLong)
        }
        return CategoryDraft(name: name, icon: icon, color: color, description: description)
    }
}

public struct TransactionDraft: Hashable, Sendable {
    public var type: TransactionType
    public var amount: Decimal
    public var categoryId: UUID
    public var transactionDate: CalendarDay
    public var description: String?
    public var reference: String?

    public static let descriptionMaxLength = 200
    public static let referenceMaxLength = 200

    public init(
        type: TransactionType, amount: Decimal, categoryId: UUID, transactionDate: CalendarDay,
        description: String? = nil, reference: String? = nil
    ) {
        self.type = type
        self.amount = amount
        self.categoryId = categoryId
        self.transactionDate = transactionDate
        self.description = description
        self.reference = reference
    }

    public func validated() throws -> TransactionDraft {
        guard amount > 0, amount <= Money.maxAmount, Money.hasAtMostTwoDecimals(amount) else {
            throw AppError.validation(ErrorCode.amountInvalid)
        }
        let description = description.normalizedOptional
        guard (description?.count ?? 0) <= Self.descriptionMaxLength else {
            throw AppError.validation(ErrorCode.descriptionTooLong)
        }
        let reference = reference.normalizedOptional
        guard (reference?.count ?? 0) <= Self.referenceMaxLength else {
            throw AppError.validation(ErrorCode.referenceTooLong)
        }
        var copy = self
        copy.description = description
        copy.reference = reference
        return copy
    }
}

public struct ListDraft: Hashable, Sendable {
    public var name: String
    public var icon: String
    public var color: String
    public var description: String?

    public init(name: String, icon: String, color: String, description: String? = nil) {
        self.name = name
        self.icon = icon
        self.color = color
        self.description = description
    }

    /// Same limits as categories: name 1–60, icon ≤16, color ≤32, description ≤200.
    public func validated() throws -> ListDraft {
        let checked = try CategoryDraft(name: name, icon: icon, color: color, description: description).validated()
        return ListDraft(name: checked.name, icon: checked.icon, color: checked.color, description: checked.description)
    }
}

public struct SignUpDraft: Hashable, Sendable {
    public var name: String
    public var email: String
    public var password: String
    public var acceptedLegalTerms: Bool

    public static let passwordLength = 8...128

    public init(name: String, email: String, password: String, acceptedLegalTerms: Bool) {
        self.name = name
        self.email = email
        self.password = password
        self.acceptedLegalTerms = acceptedLegalTerms
    }

    public func validated() throws -> SignUpDraft {
        guard acceptedLegalTerms else { throw AppError.validation(ErrorCode.legalConsentRequired) }
        let name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { throw AppError.validation(ErrorCode.nameRequired) }
        let email = try EmailAddress.normalized(email)
        guard password.count >= Self.passwordLength.lowerBound else { throw AppError.validation(ErrorCode.passwordTooShort) }
        guard password.count <= Self.passwordLength.upperBound else { throw AppError.validation(ErrorCode.passwordTooLong) }
        return SignUpDraft(name: name, email: email, password: password, acceptedLegalTerms: true)
    }
}

public enum EmailAddress {
    public static let maxLength = 254

    public static func normalized(_ raw: String) throws -> String {
        let email = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let parts = email.split(separator: "@", omittingEmptySubsequences: false)
        guard email.count <= maxLength, parts.count == 2, !parts[0].isEmpty, parts[1].contains("."),
              !parts[1].hasPrefix("."), !parts[1].hasSuffix("."), !email.contains(" ") else {
            throw AppError.validation(ErrorCode.emailInvalid)
        }
        return email
    }
}

extension Optional where Wrapped == String {
    /// Trims whitespace; empty becomes nil.
    var normalizedOptional: String? {
        guard let value = self?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else { return nil }
        return value
    }
}
