import Foundation
import ZentletCore

public enum DataSourceMode: String, Sendable {
    case local
    case remote
}

public enum StorageLocation: Sendable {
    case onDisk
    case inMemory
}

/// The only place that knows concrete implementations. Switching `dataSourceMode` swaps every repository
/// at once; ViewModels and views only receive `AppDependencies` (protocols).
public enum DependencyContainer {
    public static func make(
        dataSourceMode: DataSourceMode, network: NetworkConfiguration?, storage: StorageLocation = .onDisk,
        clock: @escaping @Sendable () -> Date = { .now }
    ) throws -> AppDependencies {
        switch dataSourceMode {
        case .local:
            return try local(storage: storage, clock: clock)
        case .remote:
            guard let network else { throw AppError.notImplemented("Remote API (no base URL configured)") }
            return remote(network: network, clock: clock)
        }
    }

    static func remote(network: NetworkConfiguration, clock: @escaping @Sendable () -> Date) -> AppDependencies {
        let tokens = KeychainTokenStore(account: "api-session-token")
        let client = APIClient(configuration: network, tokenStore: tokens)
        let session = RemoteSession()
        return AppDependencies(
            auth: RemoteAuthRepository(client: client, tokens: tokens, session: session),
            preferences: RemotePreferenceRepository(client: client),
            categories: RemoteCategoryRepository(client: client),
            transactions: RemoteTransactionRepository(client: client, session: session),
            lists: RemoteListRepository(client: client),
            listEntries: RemoteListEntryRepository(client: client),
            listMembers: RemoteListMemberRepository(client: client),
            listInvites: RemoteListInviteRepository(client: client),
            budgets: RemoteBudgetRepository(client: client),
            recurring: RemoteRecurringRepository(client: client),
            notifications: RemoteNotificationRepository(client: client),
            exports: RemoteDataExportRepository(client: client),
            ai: RemoteAIRepository(client: client),
            inbox: RemoteInboxRepository(client: client, configuration: network, session: session),
            whatsApp: RemoteWhatsAppRepository(client: client),
            billing: RemoteBillingRepository(client: client),
            hasServer: true,
            clock: clock
        )
    }

    static func local(storage: StorageLocation, clock: @escaping @Sendable () -> Date) throws -> AppDependencies {
        let store = LocalStore(container: try LocalDatabase.makeContainer(inMemory: storage == .inMemory))
        let tokens: TokenStore = storage == .inMemory ? InMemoryTokenStore() : KeychainTokenStore(account: "local-session")
        let session = LocalSession(store: tokens)
        return AppDependencies(
            auth: LocalAuthRepository(store: store, session: session, clock: clock),
            preferences: LocalPreferenceRepository(store: store, session: session),
            categories: LocalCategoryRepository(store: store, session: session, clock: clock),
            transactions: LocalTransactionRepository(store: store, session: session, clock: clock),
            lists: LocalListRepository(store: store, session: session, clock: clock),
            listEntries: LocalListEntryRepository(store: store, session: session, clock: clock),
            listMembers: LocalListMemberRepository(store: store, session: session, clock: clock),
            listInvites: LocalListInviteRepository(store: store, session: session, clock: clock),
            budgets: LocalBudgetRepository(store: store, session: session, clock: clock),
            recurring: LocalRecurringRepository(store: store, session: session, clock: clock),
            notifications: LocalNotificationRepository(store: store, session: session, clock: clock),
            exports: LocalDataExportRepository(store: store, session: session, clock: clock),
            ai: LocalAIRepository(),
            inbox: LocalInboxRepository(),
            whatsApp: LocalWhatsAppRepository(),
            billing: LocalBillingRepository(),
            hasServer: false,
            clock: clock
        )
    }
}
