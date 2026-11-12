import SwiftUI
import ZentletCore

/// "Ayer gasté 35 en almuerzo": listens once and returns the sentence to fill the movement form.
struct VoiceEntrySheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(SessionViewModel.self) private var session
    @State private var capture = SpeechCapture()
    let onTranscript: (String) -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: Spacing.xl) {
                Spacer()
                Image(systemName: capture.state == .listening ? "waveform" : "mic")
                    .font(.system(size: 56, weight: .light))
                    .symbolEffect(.variableColor.iterative, isActive: capture.state == .listening)
                    .accessibilityHidden(true)

                Text(capture.transcript.isEmpty ? hint : capture.transcript)
                    .font(.title3)
                    .foregroundStyle(capture.transcript.isEmpty ? Palette.muted : Palette.foreground)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.xl)

                statusText
                Spacer()

                if capture.state == .listening {
                    PrimaryButton(title: "Done") { finish() }
                } else if !capture.transcript.isEmpty {
                    PrimaryButton(title: "Use this") { finish() }
                    Button("Try again") { Task { await capture.start(languageCode: session.preference.language.rawValue) } }
                } else {
                    PrimaryButton(title: "Start speaking") {
                        Task { await capture.start(languageCode: session.preference.language.rawValue) }
                    }
                }
            }
            .padding(Spacing.lg)
            .navigationTitle("Dictate")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { capture.stop(); dismiss() } } }
            .task { await capture.start(languageCode: session.preference.language.rawValue) }
            .onDisappear { capture.stop() }
        }
        .presentationDetents([.medium])
    }

    private var hint: String {
        session.preference.language == .en
            ? String(localized: "Say something like “I spent 35 on lunch yesterday”")
            : String(localized: "Di algo como «ayer gasté 35 en almuerzo»")
    }

    @ViewBuilder
    private var statusText: some View {
        switch capture.state {
        case .denied:
            Text("Allow microphone and speech recognition in Settings to dictate.")
                .font(Typography.caption).foregroundStyle(Palette.destructive).multilineTextAlignment(.center)
        case .unavailable:
            Text("Dictation isn't available right now.")
                .font(Typography.caption).foregroundStyle(Palette.destructive)
        case .idle, .listening:
            EmptyView()
        }
    }

    private func finish() {
        capture.stop()
        let text = capture.transcript.trimmingCharacters(in: .whitespacesAndNewlines)
        if !text.isEmpty { onTranscript(text) }
        dismiss()
    }
}
