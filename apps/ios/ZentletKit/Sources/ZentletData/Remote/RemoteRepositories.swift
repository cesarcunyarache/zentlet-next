import Foundation
import ZentletCore

/// Remembers the signed-in user's id: several responses (the feed) omit the author because it is the caller.
actor RemoteSession {
    private var userId: UUID?

    func set(_ id: UUID?) { userId = id }

    func requireUserId() throws -> UUID {
        guard let userId else { throw AppError.unauthorized }
        return userId
    }
}

/// Better Auth at `/api/auth`. Requires the server to enable the `bearer` plugin (not configured yet) and to
/// exempt native clients from the Turnstile captcha. Replace this type if the API moves to its own auth.
public struct RemoteAuthRepository: AuthRepository {
    /// Must match `LEGAL_VERSION` on the server (`apps/web/src/features/legal/config.ts`).
    public static let legalConsentHeader = "x-legal-consent"
    public static let legalVersion = "2026-09-26"

    let client: APIClient
    let tokens: TokenStore
    let session: RemoteSession

    public func currentUser() async throws -> User? {
        guard try tokens.readToken() != nil else { return nil }
        do {
            let response = try await client.send(.get("/api/auth/get-session"), as: SessionDTO?.self)
            await session.set(response?.user.id)
            if response == nil { try tokens.deleteToken() }
            return response?.user.domain
        } catch AppError.unauthorized {
            try tokens.deleteToken()
            return nil
        }
    }

    public func signIn(email: String, password: String) async throws -> User {
        var endpoint = try Endpoint.send(.post, "/api/auth/sign-in/email", body: ["email": email, "password": password])
        endpoint.requiresAuthentication = false
        do {
            return try await authenticate(endpoint)
        } catch AppError.unauthorized {
            throw AppError.validation(ErrorCode.invalidCredentials)
        }
    }

    public func signUp(_ draft: SignUpDraft) async throws -> User {
        let draft = try draft.validated()
        var endpoint = try Endpoint.send(
            .post, "/api/auth/sign-up/email", body: ["name": draft.name, "email": draft.email, "password": draft.password]
        )
        endpoint.requiresAuthentication = false
        endpoint.headers[Self.legalConsentHeader] = Self.legalVersion
        return try await authenticate(endpoint)
    }

    public func signOut() async throws {
        try? await client.send(.post("/api/auth/sign-out"))
        try tokens.deleteToken()
        await session.set(nil)
    }

    public func completeOnboarding() async throws {
        try await client.send(.post("/api/account/onboarding"))
    }

    public func deleteAccount(password: String) async throws {
        try await client.send(try .send(.post, "/api/auth/delete-user", body: ["password": password]))
        try tokens.deleteToken()
        await session.set(nil)
    }

    /// The bearer plugin returns the session token in `set-auth-token`; the body `token` is the fallback.
    private func authenticate(_ endpoint: Endpoint) async throws -> User {
        let (response, http) = try await client.sendWithHeaders(endpoint, as: AuthResponseDTO.self)
        guard let token = http.value(forHTTPHeaderField: "set-auth-token") ?? response.token else { throw AppError.unauthorized }
        try tokens.saveToken(token)
        await session.set(response.user.id)
        return response.user.domain
    }
}

public struct RemotePreferenceRepository: PreferenceRepository {
    let client: APIClient

    /// The API answers `null` until the user saves preferences for the first time.
    public func fetch() async throws -> UserPreference {
        try await client.send(.get("/api/account/preferences"), as: PreferenceDTO?.self)?.domain ?? UserPreference()
    }

    public func update(_ preference: UserPreference) async throws -> UserPreference {
        try await client.send(try .send(.patch, "/api/account/preferences", body: PreferenceDTO(preference)), as: PreferenceDTO.self).domain
    }
}

public struct RemoteCategoryRepository: CategoryRepository {
    let client: APIClient

    public func fetchAll() async throws -> [ZentletCore.Category] {
        try await client.send(.get("/api/category"), as: [CategoryDTO].self).map(\.domain)
    }

    public func create(id: UUID, _ draft: CategoryDraft) async throws -> ZentletCore.Category {
        let body = CategoryBodyDTO(id: id, try draft.validated())
        return try await client.send(try .send(.post, "/api/category", body: body), as: CategoryDTO.self).domain
    }

    public func update(id: UUID, _ draft: CategoryDraft) async throws -> ZentletCore.Category {
        let body = CategoryBodyDTO(id: nil, try draft.validated())
        return try await client.send(try .send(.patch, "/api/category/\(id)", body: body), as: CategoryDTO.self).domain
    }

    public func delete(id: UUID) async throws {
        try await client.send(.delete("/api/category/\(id)"))
    }
}

public struct RemoteTransactionRepository: TransactionRepository {
    let client: APIClient
    let session: RemoteSession

    public func fetch(_ query: TransactionQuery) async throws -> TransactionPage {
        let userId = try await session.requireUserId()
        let endpoint = Endpoint.get("/api/transaction", query: [
            URLQueryItem(name: "from", value: query.range.from?.iso),
            URLQueryItem(name: "to", value: query.range.to?.iso),
            URLQueryItem(name: "listId", value: query.listId?.uuidString.lowercased()),
            URLQueryItem(name: "type", value: query.type?.rawValue),
            URLQueryItem(name: "categoryId", value: query.categoryId?.uuidString.lowercased()),
            URLQueryItem(name: "q", value: query.search),
            URLQueryItem(name: "cursor", value: query.cursor),
            URLQueryItem(name: "limit", value: String(query.limit)),
        ])
        let page = try await client.send(endpoint, as: PageDTO<TransactionDTO>.self)
        return TransactionPage(items: page.items.map { $0.domain(author: userId, fallbackListId: query.listId) }, nextCursor: page.nextCursor)
    }

    public func fetch(id: UUID) async throws -> Transaction? {
        let userId = try await session.requireUserId()
        do {
            return try await client.send(.get("/api/transaction/\(id)"), as: TransactionDTO.self).domain(author: userId, fallbackListId: nil)
        } catch AppError.notFound {
            return nil
        }
    }

    public func create(id: UUID, _ draft: TransactionDraft, listId: UUID?, recurrence: RecurrenceFrequency?) async throws -> Transaction {
        let userId = try await session.requireUserId()
        let body = TransactionBodyDTO(id: id, try draft.validated(), listId: listId, recurrence: recurrence)
        return try await client.send(try .send(.post, "/api/transaction", body: body), as: TransactionDTO.self)
            .domain(author: userId, fallbackListId: listId)
    }

    public func update(id: UUID, _ draft: TransactionDraft) async throws -> Transaction {
        let userId = try await session.requireUserId()
        let body = TransactionBodyDTO(id: nil, try draft.validated(), listId: nil)
        return try await client.send(try .send(.patch, "/api/transaction/\(id)", body: body), as: TransactionDTO.self)
            .domain(author: userId, fallbackListId: nil)
    }

    public func delete(id: UUID) async throws {
        try await client.send(.delete("/api/transaction/\(id)"))
    }

    public func summary(range: DayRange, listId: UUID?) async throws -> TransactionSummary {
        let endpoint = Endpoint.get("/api/transaction/summary", query: [
            URLQueryItem(name: "from", value: range.from?.iso),
            URLQueryItem(name: "to", value: range.to?.iso),
            URLQueryItem(name: "listId", value: listId?.uuidString.lowercased()),
        ])
        return try await client.send(endpoint, as: SummaryDTO.self).domain
    }
}

public struct RemoteListRepository: ListRepository {
    let client: APIClient

    public func fetchMemberships() async throws -> [ListMembership] {
        try await client.send(.get("/api/list"), as: [ListDTO].self).map(\.membership)
    }

    public func fetchDetail(id: UUID) async throws -> ListDetail {
        try await client.send(.get("/api/list/\(id)"), as: ListDetailDTO.self).domain
    }

    public func create(id: UUID, _ draft: ListDraft) async throws -> TransactionList {
        let body = ListBodyDTO(id: id, try draft.validated())
        return try await client.send(try .send(.post, "/api/list", body: body), as: ListDTO.self).list
    }

    /// PATCH answers 204, so the list is read again.
    public func update(id: UUID, _ draft: ListDraft) async throws -> TransactionList {
        try await client.send(try .send(.patch, "/api/list/\(id)", body: ListBodyDTO(id: nil, try draft.validated())))
        return try await fetchDetail(id: id).membership.list
    }

    public func delete(id: UUID) async throws {
        try await client.send(.delete("/api/list/\(id)"))
    }
}

public struct RemoteListEntryRepository: ListEntryRepository {
    let client: APIClient

    public func entries(listId: UUID, cursor: String?, limit: Int) async throws -> TransactionPage {
        let endpoint = Endpoint.get("/api/list/\(listId)/entries", query: [
            URLQueryItem(name: "cursor", value: cursor), URLQueryItem(name: "limit", value: String(limit)),
        ])
        let page = try await client.send(endpoint, as: PageDTO<ListEntryDTO>.self)
        return TransactionPage(items: page.items.map { $0.domain(listId: listId) }, nextCursor: page.nextCursor)
    }

    public func assign(listId: UUID, transactionIds: [UUID]) async throws {
        try await client.send(try .send(.post, "/api/list/\(listId)/entries", body: AssignBodyDTO(transactionIds: transactionIds)))
    }

    public func remove(listId: UUID, transactionId: UUID) async throws {
        try await client.send(.delete("/api/list/\(listId)/entries/\(transactionId)"))
    }
}

public struct RemoteListMemberRepository: ListMemberRepository {
    let client: APIClient

    public func updateRole(listId: UUID, userId: UUID, role: InviteRole) async throws {
        try await client.send(try .send(.patch, "/api/list/\(listId)/members/\(userId)", body: RoleBodyDTO(role: role)))
    }

    public func remove(listId: UUID, userId: UUID) async throws {
        try await client.send(.delete("/api/list/\(listId)/members/\(userId)"))
    }
}

public struct RemoteListInviteRepository: ListInviteRepository {
    let client: APIClient

    public func invites(listId: UUID) async throws -> [ListInvite] {
        try await client.send(.get("/api/list/\(listId)/invites"), as: [InviteDTO].self).map { $0.domain(listId: listId) }
    }

    public func create(listId: UUID, role: InviteRole) async throws -> ListInvite {
        try await client.send(try .send(.post, "/api/list/\(listId)/invites", body: RoleBodyDTO(role: role)), as: InviteDTO.self)
            .domain(listId: listId)
    }

    public func createEmailInvite(listId: UUID, role: InviteRole, email: String, language: AppLanguage) async throws -> ListInvite {
        let body = EmailInviteBodyDTO(role: role, email: try EmailAddress.normalized(email), locale: language)
        return try await client.send(try .send(.post, "/api/list/\(listId)/invites/email", body: body), as: InviteDTO.self)
            .domain(listId: listId)
    }

    public func revoke(listId: UUID, inviteId: UUID) async throws {
        try await client.send(.delete("/api/list/\(listId)/invites/\(inviteId)"))
    }

    public func preview(token: String) async throws -> InvitePreview {
        try await client.send(.get("/api/list-invite/\(Self.escaped(token))"), as: InvitePreviewDTO.self).domain
    }

    public func accept(token: String) async throws -> Bool {
        try await client.send(.post("/api/list-invite/\(Self.escaped(token))"), as: AcceptInviteDTO.self).joined
    }

    private static func escaped(_ token: String) -> String {
        token.trimmingCharacters(in: .whitespacesAndNewlines).addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? token
    }
}

public struct RemoteBudgetRepository: BudgetRepository {
    let client: APIClient

    public func fetchAll() async throws -> [Budget] {
        try await client.send(.get("/api/budget"), as: [BudgetDTO].self).map(\.domain)
    }

    public func create(id: UUID, _ draft: BudgetDraft) async throws -> Budget {
        try await client.send(try .send(.post, "/api/budget", body: BudgetBodyDTO(id: id, try draft.validated())), as: BudgetDTO.self).domain
    }

    public func delete(id: UUID) async throws {
        try await client.send(.delete("/api/budget/\(id)"))
    }

    public func setLimit(budgetId: UUID, effectiveFrom: CalendarDay, amount: Decimal) async throws -> Budget {
        let endpoint = try Endpoint.send(.put, "/api/budget/\(budgetId)/limits/\(effectiveFrom.iso)", body: AmountBodyDTO(amount: amount))
        return try await client.send(endpoint, as: BudgetDTO.self).domain
    }

    public func alerts(budgetId: UUID) async throws -> [BudgetAlert] {
        try await client.send(.get("/api/budget/\(budgetId)/alerts"), as: [BudgetAlertDTO].self).map(\.domain)
    }

    public func replaceAlerts(budgetId: UUID, _ alerts: [BudgetAlert]) async throws -> [BudgetAlert] {
        let body = AlertsBodyDTO(alerts: alerts.map { BudgetAlertDTO(id: nil, kind: $0.kind, value: $0.value) })
        return try await client.send(try .send(.put, "/api/budget/\(budgetId)/alerts", body: body), as: [BudgetAlertDTO].self).map(\.domain)
    }
}

public struct RemoteRecurringRepository: RecurringRepository {
    let client: APIClient

    public func fetch(id: UUID) async throws -> RecurringTransaction {
        try await client.send(.get("/api/recurring-transaction/\(id)"), as: RecurringDTO.self).domain
    }

    public func stop(id: UUID) async throws {
        try await client.send(.delete("/api/recurring-transaction/\(id)"))
    }

    /// The server materializes occurrences on its own schedule.
    public func materializeDue() async throws {}
}

public struct RemoteNotificationRepository: NotificationRepository {
    let client: APIClient

    public func feed() async throws -> NotificationFeed {
        try await client.send(.get("/api/notification"), as: NotificationFeedDTO.self).domain
    }

    public func markAllRead() async throws {
        try await client.send(.post("/api/notification/read"))
    }
}

public struct RemoteDataExportRepository: DataExportRepository {
    let client: APIClient

    /// The server builds an .xlsx workbook (movements and categories sheets).
    public func export(language: AppLanguage, currency: Currency) async throws -> ExportFile {
        let endpoint = Endpoint.get("/api/account/export", query: [
            URLQueryItem(name: "locale", value: language.rawValue), URLQueryItem(name: "currency", value: currency.symbol),
        ])
        let (data, response) = try await client.download(endpoint)
        let disposition = response.value(forHTTPHeaderField: "Content-Disposition") ?? ""
        let fileName = disposition.components(separatedBy: "filename=\"").last?.components(separatedBy: "\"").first
        return ExportFile(data: data, fileName: fileName?.isEmpty == false ? fileName! : "zentlet.xlsx")
    }
}

/// The web runs these three as Next.js server actions, which a native client can't call. The routes below are
/// the REST equivalents the API must expose, with the same input and output as the actions
/// (`category-suggester.ts`, `category-generator.ts`, `receipt-scanner.ts`). Until then remote mode falls back
/// to the on-device assistant.
public struct RemoteAIRepository: AIRepository {
    let client: APIClient
    let fallback = LocalAIRepository()

    public func suggestCategory(description: String, categories: [ZentletCore.Category], language: AppLanguage) async throws -> CategorySuggestion? {
        let text = String(description.trimmingCharacters(in: .whitespacesAndNewlines).prefix(AILimits.maxDescriptionLength))
        guard text.count >= AILimits.minDescriptionLength, !categories.isEmpty else { return nil }
        let body = SuggestCategoryBodyDTO(description: text, categories: categories.map { CategoryRefDTO(id: $0.id, name: $0.name) })
        do {
            let result = try await client.send(try .send(.post, "/api/ai/category-suggestion", body: body), as: CategorySuggestionDTO?.self)
            return result.map { CategorySuggestion(categoryId: $0.categoryId, type: $0.type) }
        } catch AppError.notFound {
            return try await fallback.suggestCategory(description: description, categories: categories, language: language)
        }
    }

    public func categoryStyles(for prompt: String) async throws -> [CategoryStyle] {
        let text = String(prompt.trimmingCharacters(in: .whitespacesAndNewlines).prefix(AILimits.maxPromptLength))
        guard !text.isEmpty else { return [] }
        do {
            let result = try await client.send(try .send(.post, "/api/ai/category-styles", body: ["prompt": text]), as: CategoryStylesDTO?.self)
            return result?.categories.map { CategoryStyle(icon: $0.icon, color: $0.color) } ?? []
        } catch AppError.notFound {
            return try await fallback.categoryStyles(for: prompt)
        }
    }

    public func scanReceipt(image: Data, mimeType: String, categories: [ZentletCore.Category], today: CalendarDay) async throws -> ReceiptExtraction {
        guard image.count <= AILimits.maxReceiptBytes, ["image/jpeg", "image/png", "image/webp"].contains(mimeType) else {
            throw ReceiptScanError.invalidImage
        }
        let categoriesJSON = String(decoding: try JSONEncoder().encode(categories.map { CategoryRefDTO(id: $0.id, name: $0.name) }), as: UTF8.self)
        let result: ReceiptScanDTO
        do {
            result = try await client.sendMultipart(
                path: "/api/ai/receipt", fields: ["categories": categoriesJSON, "today": today.iso],
                file: (name: "image", fileName: "receipt", mimeType: mimeType, data: image), as: ReceiptScanDTO.self
            )
        } catch AppError.notFound {
            return try await fallback.scanReceipt(image: image, mimeType: mimeType, categories: categories, today: today)
        }
        guard result.ok, let extraction = result.extraction else {
            throw ReceiptScanError(rawValue: result.error ?? "") ?? .failed
        }
        return ReceiptExtraction(
            amount: extraction.amount.map(Money.rounded), currency: extraction.currency, date: extraction.date.flatMap(CalendarDay.init(iso:)),
            summary: extraction.summary, description: extraction.description, categoryId: extraction.categoryId, type: extraction.type
        )
    }
}

public struct RemoteInboxRepository: InboxRepository {
    let client: APIClient
    let configuration: NetworkConfiguration
    let session: RemoteSession

    public func items() async throws -> [InboxItem] {
        try await client.send(.get("/api/inbox"), as: [InboxItemDTO].self).map(\.domain)
    }

    public func connection() async throws -> InboxConnection {
        try await client.send(.get("/api/inbox/connection"), as: InboxConnectionDTO.self).domain
    }

    public func createForwardingAddress() async throws -> InboxConnection {
        try await client.send(.post("/api/inbox/connection"), as: InboxConnectionDTO.self).domain
    }

    /// Opened in an authentication browser session; the server answers with a redirect to `/admin?gmail=<result>`.
    public func gmailConnectURL() async throws -> URL {
        configuration.baseURL.appending(path: "/api/inbox/gmail/connect")
    }

    public func disconnectGmail() async throws -> InboxConnection {
        try await client.send(.delete("/api/inbox/gmail"), as: InboxConnectionDTO.self).domain
    }

    public func addSender(address: String) async throws -> InboxSender {
        let address = address.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (3...254).contains(address.count) else { throw AppError.validation(ErrorCode.emailInvalid) }
        return try await client.send(try .send(.post, "/api/inbox/senders", body: ["address": address]), as: InboxSenderDTO.self).domain
    }

    public func removeSender(id: UUID) async throws {
        try await client.send(.delete("/api/inbox/senders/\(id)"))
    }

    public func accept(itemId: UUID, _ draft: TransactionDraft) async throws -> Transaction {
        let draft = try draft.validated()
        let userId = try await session.requireUserId()
        let body = InboxAcceptBodyDTO(
            description: draft.description ?? "", amount: draft.amount, type: draft.type, categoryId: draft.categoryId,
            transactionDate: draft.transactionDate
        )
        let created = try await client.send(try .send(.post, "/api/inbox/\(itemId)/accept", body: body), as: TransactionDTO.self)
        return created.domain(author: userId, fallbackListId: nil)
    }

    public func dismiss(itemId: UUID) async throws {
        try await client.send(.post("/api/inbox/\(itemId)/dismiss"))
    }
}

public struct RemoteWhatsAppRepository: WhatsAppRepository {
    let client: APIClient

    public func connection() async throws -> WhatsAppConnection {
        try await client.send(.get("/api/whatsapp/connection"), as: WhatsAppConnectionDTO.self).domain
    }

    public func createLinkCode() async throws -> WhatsAppLinkCode {
        try await client.send(.post("/api/whatsapp/connection"), as: WhatsAppLinkDTO.self).domain
    }

    public func unlink() async throws -> WhatsAppConnection {
        try await client.send(.delete("/api/whatsapp/connection"), as: WhatsAppConnectionDTO.self).domain
    }
}

/// Mercado Pago subscriptions. See the README about App Store rules before enabling checkout on iOS.
public struct RemoteBillingRepository: BillingRepository {
    let client: APIClient

    public func summary() async throws -> BillingSummary {
        try await client.send(.get("/api/billing/me"), as: BillingSummaryDTO.self).domain
    }

    public func checkout(plan: String) async throws -> URL {
        try await client.send(try .send(.post, "/api/billing/checkout", body: ["planKey": plan]), as: CheckoutDTO.self).redirectUrl
    }

    public func sync() async throws -> BillingSummary {
        try await client.send(.post("/api/billing/sync"), as: BillingSummaryDTO.self).domain
    }

    public func cancel() async throws -> BillingSummary {
        try await client.send(.post("/api/billing/cancel"), as: BillingSummaryDTO.self).domain
    }
}
