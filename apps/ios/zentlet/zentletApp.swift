import SwiftUI
import ZentletCore
import ZentletData

@main
struct ZentletApp: App {
    private let dependencies: AppDependencies?
    private let startupError: String?
    @State private var session: SessionViewModel?

    init() {
        let configuration = AppConfiguration.current
        do {
            let dependencies = try DependencyContainer.make(
                dataSourceMode: configuration.dataSourceMode, network: configuration.network
            )
            self.dependencies = dependencies
            startupError = nil
            _session = State(initialValue: SessionViewModel(auth: dependencies.auth, preferences: dependencies.preferences))
        } catch {
            dependencies = nil
            startupError = UserMessage.from(error)
        }
    }

    var body: some Scene {
        WindowGroup {
            if let dependencies, let session {
                AppRootView()
                    .environment(\.dependencies, dependencies)
                    .environment(session)
            } else {
                ContentUnavailableView(
                    "Can't start Zentlet", systemImage: "exclamationmark.triangle", description: Text(startupError ?? "")
                )
            }
        }
    }
}
