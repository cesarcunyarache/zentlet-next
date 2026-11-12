import Foundation

/// Error codes shared with the web API, so local and remote sources fail the same way.
public enum ErrorCode {
    public static let notFound = "not_found"
    public static let idTaken = "id_taken"
    public static let limitReached = "limit_reached"
    public static let hasTransactions = "has_transactions"
    public static let categoryNotFound = "category_not_found"
    public static let transactionNotFound = "transaction_not_found"
    public static let currencyMismatch = "currency_mismatch"
    public static let inviteInvalid = "invite_invalid"
    public static let memberNotFound = "member_not_found"
    public static let ownerCannotLeave = "owner_cannot_leave"
    public static let invalidCredentials = "invalid_credentials"
    public static let emailTaken = "email_taken"
    public static let legalConsentRequired = "LEGAL_CONSENT_REQUIRED"
    public static let nameRequired = "name_required"
    public static let nameTooLong = "name_too_long"
    public static let descriptionTooLong = "description_too_long"
    public static let referenceTooLong = "reference_too_long"
    public static let iconInvalid = "icon_invalid"
    public static let colorInvalid = "color_invalid"
    public static let amountInvalid = "amount_invalid"
    public static let emailInvalid = "email_invalid"
    public static let passwordTooShort = "password_too_short"
    public static let passwordTooLong = "password_too_long"
    public static let timezoneInvalid = "timezone_invalid"
    public static let listNotFound = "list_not_found"
    public static let categoryHasBudget = "category_has_budget"
    public static let alertAboveLimit = "alert_above_limit"
    public static let alertsInvalid = "alerts_invalid"
    public static let invalidPeriodStart = "invalid_period_start"
    public static let limitBeforeStart = "limit_before_start"
    public static let singlePeriod = "single_period"
}

public enum ValidationMessages {
    public static func text(for code: String) -> String {
        switch code {
        case ErrorCode.notFound: String(localized: "The item no longer exists.")
        case ErrorCode.idTaken: String(localized: "This item already exists.")
        case ErrorCode.limitReached: String(localized: "Category limit reached.")
        case ErrorCode.hasTransactions: String(localized: "This category has transactions. Move or delete them first.")
        case ErrorCode.categoryNotFound: String(localized: "Choose a valid category.")
        case ErrorCode.transactionNotFound: String(localized: "Some transactions are not yours or no longer exist.")
        case ErrorCode.currencyMismatch: String(localized: "This list uses a different currency than your account.")
        case ErrorCode.inviteInvalid: String(localized: "This invite has expired or is no longer valid.")
        case ErrorCode.memberNotFound: String(localized: "This person is no longer a member.")
        case ErrorCode.ownerCannotLeave: String(localized: "The owner can't leave the list.")
        case ErrorCode.invalidCredentials: String(localized: "Incorrect email or password.")
        case ErrorCode.emailTaken: String(localized: "An account with this email already exists.")
        case ErrorCode.legalConsentRequired: String(localized: "You must accept the terms to create an account.")
        case ErrorCode.nameRequired: String(localized: "Enter a name.")
        case ErrorCode.nameTooLong: String(localized: "The name is too long.")
        case ErrorCode.descriptionTooLong: String(localized: "The description is too long.")
        case ErrorCode.referenceTooLong: String(localized: "The reference is too long.")
        case ErrorCode.iconInvalid: String(localized: "Choose an icon.")
        case ErrorCode.colorInvalid: String(localized: "Choose a color.")
        case ErrorCode.amountInvalid: String(localized: "Enter an amount greater than zero with up to two decimals.")
        case ErrorCode.emailInvalid: String(localized: "Enter a valid email.")
        case ErrorCode.passwordTooShort: String(localized: "The password must have at least 8 characters.")
        case ErrorCode.passwordTooLong: String(localized: "The password is too long.")
        case ErrorCode.timezoneInvalid: String(localized: "Choose a valid time zone.")
        case ErrorCode.listNotFound: String(localized: "You can't add budgets to this list.")
        case ErrorCode.categoryHasBudget: String(localized: "This category already has a budget in this list.")
        case ErrorCode.alertAboveLimit: String(localized: "Alerts must be below the budget limit.")
        case ErrorCode.alertsInvalid: String(localized: "Use up to 5 different alerts; percentages between 1 and 99.")
        case ErrorCode.invalidPeriodStart: String(localized: "The date must be the start of a period.")
        case ErrorCode.limitBeforeStart: String(localized: "The limit can't start before the budget.")
        case ErrorCode.singlePeriod: String(localized: "A one-time budget has a single period.")
        default: String(localized: "Check the data and try again.")
        }
    }
}
