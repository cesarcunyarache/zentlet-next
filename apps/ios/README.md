# Zentlet iOS

Native SwiftUI client (iOS 18+). Local-first: the app runs entirely on SwiftData today, and a REST layer is ready to replace it with a single configuration change.

## Layout

```text
apps/ios/
├── zentlet/                  App target: SwiftUI only
│   ├── Application/          App entry, AppConfiguration (data source switch), root navigation
│   ├── Core/DesignSystem/    Tokens (spacing, radius, palette, type) and shared components
│   ├── Features/             Authentication, Onboarding, Dashboard, Transactions, Categories, Budgets,
│   │                         SharedLists, Notifications, Settings
│   └── Localizable.xcstrings English keys with Spanish translations
└── ZentletKit/               Local Swift package (testable on macOS with `swift test`)
    ├── ZentletCore           Domain models, business rules, repository protocols, ViewModels.
    │                         Never imports SwiftData or URLSession.
    └── ZentletData           SwiftData store + local repositories, URLSession API client +
                              remote repositories, Keychain, DependencyContainer.
```

Views import `ZentletCore` only. The module boundary is what guarantees ViewModels can't touch SwiftData.

## Switching the data source

`zentlet/Application/AppConfiguration.swift`:

```swift
dataSourceMode: .local   // SwiftData on device (default)
dataSourceMode: .remote  // REST API at `network.baseURL`
```

`DependencyContainer.make(dataSourceMode:network:)` builds every repository for that mode and returns `AppDependencies` (protocols only). Nothing else changes.

## Where business rules live

| Rule | Where |
| --- | --- |
| Input limits (names, amounts, descriptions, emails) | `ZentletCore/Rules/Drafts.swift` — run before either source is called |
| List permissions, currency match, private-list fallback, invite validity, hand-over successor | `ZentletCore/Rules/ListPolicy.swift` |
| Summaries, per-member breakdown, home headline and category strip (with budget bars) | `ZentletCore/Rules/Calculations.swift` |
| Budget periods, limits over time, progress, alert rules and notice dedupe | `ZentletCore/Domain/Budget.swift` |
| Recurring schedule (weekly / month-based, day clamped to month end) | `ZentletCore/Domain/Recurring.swift` |
| Authorization and persistence in local mode | `ZentletData/Local/*` (acts as the "server" and calls the policies above) |
| Authorization in remote mode | The server; remote repositories only map DTOs |

Money is `Decimal` rounded to cents; days are `CalendarDay` (`YYYY-MM-DD`), ranges are `from` inclusive / `to` exclusive, as on the web.

## Local mode

- Accounts are development accounts stored on the device (salted PBKDF2-SHA256, never plain text). The session id is kept in the Keychain.
- Several accounts can exist on one device, so shared lists can be tested end to end: create an invite as the owner, sign out, sign in as someone else, and join with the code.
- Expense splitting or debts between members don't exist in the web product, so they aren't here either. Lists show a per-member breakdown of what each person recorded.

## Remote mode: what the server must provide

The remote repositories follow the current web Route Handlers (`apps/web/src/app/api/**`) field for field. Before switching to `.remote`, the API needs:

1. **Native auth.** Better Auth works on iOS, but only with the `bearer` plugin, which is not enabled today. Without it, sessions are cookie-only. Add `bearer()` to `plugins` in `apps/web/src/lib/auth.ts` (or the equivalent in `apps/api`). `RemoteAuthRepository` reads the token from the `set-auth-token` header, falls back to the body `token`, and sends `Authorization: Bearer`.
2. **Captcha exemption for native.** Turnstile guards `/sign-up/email` and `/sign-in/email`. A native client can't solve it, so native requests need another abuse control (for example App Attest).
3. **Legal consent.** Sign-up sends `x-legal-consent: 2026-09-26`. Keep `RemoteAuthRepository.legalVersion` in sync with `LEGAL_VERSION`, or expose the version from the API.
4. **Error codes.** Errors are `{ message }` with human text. `APIErrorMapping` maps the known messages back to codes. A machine `code` field in error bodies would remove that coupling.
5. **Base URL.** `AppConfiguration` uses `http://localhost:3001` in Debug and `nil` in Release (remote mode refuses to start without it).

If `apps/api` replaces Better Auth with its own auth, only `RemoteAuthRepository` changes.

### Contract notes

- `GET /api/transaction` and `/summary` return only the caller's own transactions, and the payload has no author. The client fills in the signed-in user.
- `GET /api/account/preferences` may return `null`. The client treats that as the defaults (es, PEN, America/Lima).
- `PATCH /api/list/:id` returns 204, so the client reads the list again.
- List members come without email or join date.
- The invite token is returned only by `POST /api/list/:id/invites`. The web shares `/admin/list/invite/:token`. The app shares the raw code, which is pasted into "Join with a code".

## Local stand-ins for server jobs

- Recurring movements: the web creates due occurrences with a cron. Local mode does it when the app starts or returns to the foreground (`RecurringRepository.materializeDue`). Remote mode leaves it to the server.
- Budget notices and list notices (`list.joined`, `list.owned`) are stored locally and shown in the bell on Home.
- Export: local mode writes a CSV with the same columns as the web workbook's movements sheet; remote mode downloads the server's .xlsx.

## Invite links

`MainTabView` handles `…/list/invite/<token>` and `zentlet://invite/<token>`. For these links to open the app, the project still needs Associated Domains or a URL type.

## Not ported (needs the server or a product decision)

- AI: category suggestions while typing, the category generator, receipt scanning and voice dictation (the onboarding steps "type" and "voice" describe these, so they are left out).
- Gmail inbox import, WhatsApp, billing.
- Email invites (`POST /api/list/:id/invites/email`): the response contract wasn't audited.
- Legal pages and cookie consent screens.
