import Foundation
import Observation

@MainActor
@Observable
public final class NotificationsViewModel {
    public private(set) var items: [AppNotification] = []
    public private(set) var unreadCount = 0
    public var errorMessage: String?

    private let repository: NotificationRepository

    public init(repository: NotificationRepository) {
        self.repository = repository
    }

    public func load() async {
        do {
            let feed = try await repository.feed()
            items = feed.items
            unreadCount = feed.unreadCount
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }

    public func markAllRead() async {
        guard unreadCount > 0 else { return }
        do {
            try await repository.markAllRead()
            unreadCount = 0
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }
}

@MainActor
@Observable
public final class ExportViewModel {
    /// Local file ready to share, once exported.
    public private(set) var fileURL: URL?
    public private(set) var isExporting = false
    public var errorMessage: String?

    private let repository: DataExportRepository

    public init(repository: DataExportRepository) {
        self.repository = repository
    }

    public func export(preference: UserPreference) async {
        isExporting = true
        errorMessage = nil
        defer { isExporting = false }
        do {
            let file = try await repository.export(language: preference.language, currency: preference.currency)
            let url = FileManager.default.temporaryDirectory.appending(path: file.fileName)
            try file.data.write(to: url, options: .atomic)
            fileURL = url
        } catch {
            errorMessage = UserMessage.from(error)
        }
    }
}

/// Intro pages shown once after sign-up. Mirrors the web steps (`type`, `voice`, `budget`, `month`);
/// finishing either goes to the app or straight to creating the first category.
public enum OnboardingStep: String, CaseIterable, Sendable {
    case type
    case voice
    case budget
    case month
}
