import SwiftUI
import ZentletCore

extension EnvironmentValues {
    @Entry var dependencies: AppDependencies? = nil
}

/// Reads the injected dependencies (always set by `ZentletApp`) and builds a screen with them.
struct WithDependencies<Content: View>: View {
    @Environment(\.dependencies) private var dependencies
    private let content: (AppDependencies) -> Content

    init(@ViewBuilder _ content: @escaping (AppDependencies) -> Content) {
        self.content = content
    }

    var body: some View {
        if let dependencies { content(dependencies) }
    }
}

struct AppRootView: View {
    @Environment(SessionViewModel.self) private var session

    var body: some View {
        Group {
            switch session.state {
            case .restoring:
                ProgressView()
            case .signedOut:
                AuthenticationView()
            case .signedIn(let user):
                MainTabView(user: user)
                    .id(user.id)
            }
        }
        .task { await session.restore() }
        .animation(.default, value: session.state)
    }
}

struct MainTabView: View {
    let user: User
    @Environment(\.dependencies) private var dependencies
    @Environment(\.scenePhase) private var scenePhase
    @Environment(SessionViewModel.self) private var session
    @State private var inviteToken: InviteLink?
    @State private var showsOnboarding = false

    var body: some View {
        tabs
            .task {
                showsOnboarding = user.onboardingCompletedAt == nil
                await materializeRecurring()
            }
            .onChange(of: scenePhase) { if scenePhase == .active { Task { await materializeRecurring() } } }
            .onOpenURL { url in inviteToken = InviteLink(url: url) }
            .sheet(item: $inviteToken) { JoinListView(token: $0.token) }
            .fullScreenCover(isPresented: $showsOnboarding) { OnboardingView() }
    }

    /// Local mode creates due recurring movements on launch (the server does it on a schedule).
    private func materializeRecurring() async {
        try? await dependencies?.recurring.materializeDue()
    }

    private var tabs: some View {
        TabView {
            Tab("Home", systemImage: "house") {
                NavigationStack { DashboardView() }
            }
            Tab("Movements", systemImage: "list.bullet") {
                NavigationStack { TransactionsView() }
            }
            Tab("Lists", systemImage: "person.2") {
                NavigationStack { ListsView(currentUserId: user.id) }
            }
            Tab("Settings", systemImage: "gearshape") {
                NavigationStack { SettingsView() }
            }
        }
    }
}

/// An invite opened from a link: `…/list/invite/<token>` (the web URL shape) or `zentlet://invite/<token>`.
struct InviteLink: Identifiable {
    let token: String
    var id: String { token }

    init?(url: URL) {
        let parts = url.pathComponents.filter { $0 != "/" }
        if let index = parts.firstIndex(of: "invite"), index + 1 < parts.count {
            token = parts[index + 1]
        } else if url.host() == "invite", let first = parts.first {
            token = first
        } else {
            return nil
        }
    }
}
