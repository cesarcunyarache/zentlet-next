import Foundation
import ZentletData

enum AppEnvironment: String, Sendable {
    case development
    case production
}

/// Central switch for the data source. Change `dataSourceMode` to `.remote` once the API contracts are live.
struct AppConfiguration: Sendable {
    let environment: AppEnvironment
    let dataSourceMode: DataSourceMode
    /// nil until the production API URL is decided; `.remote` refuses to start without it.
    let network: NetworkConfiguration?

    static let current: AppConfiguration = {
        #if DEBUG
        return AppConfiguration(
            environment: .development,
            dataSourceMode: .local,
            network: NetworkConfiguration(baseURL: URL(string: "http://localhost:3001")!)
        )
        #else
        return AppConfiguration(environment: .production, dataSourceMode: .local, network: nil)
        #endif
    }()
}
