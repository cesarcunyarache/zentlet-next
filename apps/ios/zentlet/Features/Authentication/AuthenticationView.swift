import SwiftUI
import ZentletCore

struct AuthenticationView: View {
    private enum Mode { case signIn, signUp }

    @Environment(SessionViewModel.self) private var session
    @State private var mode: Mode = .signIn
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var acceptedTerms = false

    var body: some View {
        @Bindable var session = session
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Zentlet").font(.largeTitle.bold())
                        Text(mode == .signIn ? "Sign in to your account" : "Create your account")
                            .foregroundStyle(Palette.muted)
                    }
                    .listRowBackground(Color.clear)
                }

                Section {
                    if mode == .signUp {
                        TextField("Name", text: $name)
                            .textContentType(.name)
                    }
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    SecureField("Password", text: $password)
                        .textContentType(mode == .signIn ? .password : .newPassword)
                }

                if mode == .signUp {
                    Section {
                        Toggle("I accept the terms and the processing of my financial data", isOn: $acceptedTerms)
                            .font(.footnote)
                    }
                }

                Section {
                    PrimaryButton(title: mode == .signIn ? "Sign in" : "Create account", isLoading: session.isWorking) {
                        Task { await submit() }
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }

                Section {
                    Button(mode == .signIn ? "Don't have an account? Sign up" : "Already have an account? Sign in") {
                        mode = mode == .signIn ? .signUp : .signIn
                    }
                    .frame(maxWidth: .infinity)
                }
                .listRowBackground(Color.clear)

                Section {
                    Text("Development build: accounts are stored only on this device.")
                        .font(Typography.caption)
                        .foregroundStyle(Palette.muted)
                }
                .listRowBackground(Color.clear)
            }
            .errorAlert($session.errorMessage)
        }
    }

    private func submit() async {
        switch mode {
        case .signIn:
            await session.signIn(email: email, password: password)
        case .signUp:
            await session.signUp(SignUpDraft(name: name, email: email, password: password, acceptedLegalTerms: acceptedTerms))
        }
    }
}
