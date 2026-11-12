import SwiftUI
import ZentletCore

/// Bell with the unread count; opens the notices sheet.
struct NotificationBell: View {
    var body: some View {
        WithDependencies { dependencies in
            NotificationBellButton(model: NotificationsViewModel(repository: dependencies.notifications))
        }
    }
}

private struct NotificationBellButton: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var model: NotificationsViewModel
    @State private var isOpen = false

    init(model: NotificationsViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        Button {
            isOpen = true
        } label: {
            Image(systemName: model.unreadCount > 0 ? "bell.badge" : "bell")
        }
        .accessibilityLabel(model.unreadCount > 0 ? "Notifications, \(model.unreadCount) unread" : "Notifications")
        .task { await model.load() }
        .onChange(of: scenePhase) { if scenePhase == .active { Task { await model.load() } } }
        .sheet(isPresented: $isOpen, onDismiss: { Task { await model.markAllRead() } }) {
            NotificationsSheet(model: model)
        }
    }
}

private struct NotificationsSheet: View {
    @Environment(\.dismiss) private var dismiss
    let model: NotificationsViewModel

    var body: some View {
        NavigationStack {
            List(model.items) { item in
                HStack(alignment: .top, spacing: Spacing.md) {
                    Circle()
                        .fill(item.isUnread ? Palette.foreground : .clear)
                        .frame(width: 8, height: 8)
                        .padding(.top, 6)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(item.content.title).font(.subheadline.weight(.semibold))
                        Text(item.content.body).font(.subheadline).foregroundStyle(Palette.muted)
                        Text(item.createdAt.formatted(.relative(presentation: .named)))
                            .font(Typography.caption)
                            .foregroundStyle(Palette.muted)
                    }
                }
                .accessibilityElement(children: .combine)
            }
            .overlay {
                if model.items.isEmpty {
                    ContentUnavailableView("No notifications", systemImage: "bell", description: Text("Budget alerts and list updates show up here."))
                }
            }
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
    }
}
