import Foundation
import Testing
import ZentletCore
@testable import ZentletData

struct LocalAccountTests {
    @Test func signUpCreatesSessionPreferenceAndPrivateList() async throws {
        let device = try LocalHarness()
        let ana = try await device.signUp("Ana")

        #expect(try await device.auth.currentUser() == ana)
        #expect(try await device.preferences.fetch().currency == .pen)
        let lists = try await device.lists.fetchMemberships()
        #expect(lists.count == 1)
        #expect(lists[0].list.isPrivate)
        #expect(lists[0].list.name == "Lista privada")
        #expect(lists[0].role == .owner)
    }

    @Test func rejectsDuplicateEmailAndWrongPassword() async throws {
        let device = try LocalHarness()
        try await device.signUp("Ana")
        await #expect(throws: AppError.conflict(ErrorCode.emailTaken)) { try await device.signUp("Ana") }
        await #expect(throws: AppError.validation(ErrorCode.invalidCredentials)) {
            try await device.signIn("Ana", password: "wrong-pass")
        }
    }

    @Test func passwordsAreNeverStoredInPlainText() async throws {
        let device = try LocalHarness()
        try await device.signUp("Ana", password: "supersecret")
        let stored = try await device.store.perform { context in
            try context.fetch(FetchDescriptorFactory.users()).map { ($0.passwordHash, $0.passwordSalt) }
        }
        #expect(stored.count == 1)
        #expect(stored[0].0 != Data("supersecret".utf8))
        #expect(stored[0].1.count == 16)
    }

    @Test func signOutEndsTheSessionAndDataNeedsOne() async throws {
        let device = try LocalHarness()
        try await device.signUp("Ana")
        try await device.auth.signOut()
        #expect(try await device.auth.currentUser() == nil)
        await #expect(throws: AppError.unauthorized) { try await device.categories.fetchAll() }
    }

    @Test func dataSurvivesReopeningTheStore() async throws {
        let url = FileManager.default.temporaryDirectory.appending(path: "zentlet-\(UUID().uuidString).store")
        defer { try? FileManager.default.removeItem(at: url) }
        let tokens = InMemoryTokenStore()

        do {
            let device = try LocalHarness(store: LocalStore(container: LocalDatabase.makeContainer(url: url)))
            try device.tokens.saveToken("")
            try await device.signUp("Ana")
            let food = try await device.category()
            _ = try await device.expense(12.5, category: food.id)
            try tokens.saveToken(try device.tokens.readToken()!)
        }

        let reopened = try LocalHarness(store: LocalStore(container: LocalDatabase.makeContainer(url: url)))
        try reopened.tokens.saveToken(try tokens.readToken()!)
        #expect(try await reopened.auth.currentUser()?.name == "Ana")
        #expect(try await reopened.categories.fetchAll().map(\.name) == ["Food"])
        #expect(try await reopened.transactions.fetch(TransactionQuery()).items.map(\.amount) == [12.5])
    }

    @Test func updatingPreferencesValidatesTimeZone() async throws {
        let device = try LocalHarness()
        try await device.signUp("Ana")
        let updated = try await device.preferences.update(UserPreference(language: .en, currency: .usd, timezone: "Europe/Madrid"))
        #expect(updated == UserPreference(language: .en, currency: .usd, timezone: "Europe/Madrid"))
        await #expect(throws: AppError.validation(ErrorCode.timezoneInvalid)) {
            try await device.preferences.update(UserPreference(timezone: "Mars/Base"))
        }
    }
}

enum FetchDescriptorFactory {
    static func users() -> FetchDescriptor<UserEntity> { FetchDescriptor<UserEntity>() }
}

import SwiftData
