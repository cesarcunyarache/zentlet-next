# NestJS API backend port (apps/api)

Branch: chore/migrate-turborepo. Delivery: ask-on-risk (default), work-unit commits. Test runner: `pnpm --filter @zentlet/api test` (vitest), `pnpm --filter @zentlet/api typecheck`, `pnpm --filter @zentlet/api lint`.

## Specs

- S1: "quiero que implmentes el modulo de categorias en api ... crear use case y use case de carpeteas y dentro pones el input y el use case como tal" — categories module, one folder per use case with input + use-case. **Done** (create-category, list-categories).
- S2: "mante la arquitecura limpia dal rapido es un modulo pequeño" — keep clean/hexagonal architecture.
- S3: "tendrias que poner modules no? por que en src seguro vas añadir infrastructure o shared" — business modules under `src/modules/<name>`, cross-cutting concerns under `src/shared/<service>` once needed. **Done** (category moved to `src/modules/category`).
- S4: "quiero que implementes por completo el backend guiandote de lo que tenemos" — port the existing apps/web server logic into apps/api.
- S5: "quiero el tema prisma ... tampoco el tema de prisma creo que eso infraestructura separa reponsabilidad" — Prisma stays an infrastructure detail (repository adapters only); domain/application never import `@prisma/client`.
- S6: "la auth considera la auth que vamos a integrar en la app de ios ... un agente ya esta implementando ios tienes que hacer match con la auth" — auth must work for the native iOS app. Resolved via user choice (AskUserQuestion): **Sign in with Apple nativo**, in addition to keeping email/password and Google/GitHub (what apps/web already has via Better Auth).
- S7: "el tema del correo servicio externo que se va a cambiar" — email is an external service behind a port, must be swappable.
- S8: "el tema orquestacion que hay tambien" — background/orchestration tasks behind a port, must be swappable.
- S9: "usa una implementacion propia de logger pero implementa pino si luego cambio por otra que sea sencillo" — own `Logger` port, Pino adapter, swappable.
- S10: "es la misma analogia para todo el tema el pago servicios externo" — payments (Mercado Pago) behind a port, swappable.
- S11: "nada de acoplar redis todo ello debe vivir descoplado" — cache/rate-limit store behind a port, swappable (Redis adapter, degrade without it).
- S12: "implementa por fa todo lo es la api tal cual" — implement the above for the API, following the exact same ports-and-adapters pattern already documented in `docs/architecture.md`.

**Explicitly out of scope for this pass** (apps/web features not named by the user and large enough to need their own round): WhatsApp integration, in-app notifications, Gmail/inbox auto-import, recurring transactions, budgets, transaction lists/sharing, feature flags. Flagged to the user; continue only if asked.

## Tasks

| ID | Spec | Route | Status | Commit |
|----|------|-------|--------|--------|
| T1 | S2,S3,S5,S7,S8,S9,S11 | inline (parent) | done | (this session, pre-doc) |
| T2 | S5,S7,S8,S9,S11 | inline (parent) | done | (uncommitted, this session) |
| T3 | S1 | inline (parent) | done | (part of T2 commit — PrismaCategoryRepository) |
| T4 | S4,S6 | delegated writer (independent unit; Risk: item 2 — auth) | writer done, own checks clean (typecheck/lint/9 files/20 tests) — pending wiring + independent verification | — |
| T5 | S4,S10 | delegated writer (independent unit; Risk: item 1, item 3 — money/contracts) | writer done, own checks clean (typecheck/lint/22 files/108 tests) | — |
| T6 | all | inline (parent) | wired (AuthModule + BillingModule registered in AppModule); full suite clean (typecheck/lint/22 files/108 tests); independent verifier running (agent a64464754cc38dc6f) over T4+T5 | — |

- T1: category module first slice (create/list use-cases, domain port, in-memory adapter, `src/modules/category`). Already done before this doc existed.
- T2: shared infra skeleton under `src/shared/`: `prisma` (PrismaModule/PrismaService, schema copied from apps/web pointed at the same `DATABASE_URL`, generate-only — **migrations stay owned by apps/web**, never run `prisma migrate` from apps/api until schema ownership formally moves to a shared package), `logger` (port + Pino adapter), `email` (port + Resend adapter, dev console fallback), `kv` (port + ioredis adapter, no-op fallback), `background` (port + simple adapter).
- T3: upgrade category module with a real `PrismaCategoryRepository` adapter, wired as the default provider (in-memory adapter kept for unit tests).
- T4: `modules/auth` — domain (User/Session/Account types), ports (`PasswordHasher` — must byte-compatible with Better Auth's existing hashes: `scrypt(N=16384, r=16, p=1, dkLen=64)`, salt 16 random bytes hex, hash = `${saltHex}:${keyHex}`, password normalized NFKC — verified by reading `@better-auth/utils/password.node.mjs`; `AppleIdentityVerifier`; `GoogleIdentityVerifier`; `GitHubOAuthExchanger`; `SessionRepository`), use-cases (sign-up-with-password, sign-in-with-password, sign-in-with-apple, sign-in-with-google, sign-in-with-github, refresh-session, sign-out, get-session), infrastructure (Prisma-backed repos against the existing `User`/`Session`/`Account`/`Verification` tables — same schema as apps/web, no new migration).
- T5: `modules/billing` — port `BillingProvider` (createCheckout, getSubscription, getPayment, cancelSubscription, refundPayment, parseWebhook) mirroring `apps/web/src/features/billing/providers/types.ts`, Mercado Pago adapter (HMAC signature verification like `apps/web/.../providers/mercadopago/signature.ts`), domain entities + Prisma repos for `Subscription`/`BillingPayment`/`BillingEvent`, use-cases mirroring `apps/web/src/features/billing/server/application/use-cases/*`.
- T6: wire `AuthModule`/`BillingModule` into `AppModule`, consolidate `package.json` dependencies and `.env.example`, run full typecheck/lint/test, fix integration seams, one independent verification pass over T4+T5 (both name high-risk items).

## Log

- L1 (2026-11-11): User's original request — "quiero que implmentes el modulo de categorias en api por fa ... inicia con categorias por fa mante la arquitecura limpia dal rapido es un modulo pequeño en applicacion crear use case y use case de carpeteas y dentro pones el input y el use case como tal ok? dale hazlo depende como haga te dire que implementes todo" → delivered as T1.
- L2 (2026-11-11): User — "tendrias que poner modules no? ... en src seguro vas añadir infrastructure o shared ... supongo que mas adelante va ir escalando eso?" → delivered: `src/modules/category`, `src/shared/` reserved for later.
- L3 (2026-11-11): User — full request to implement the whole backend (quoted in S4-S12). Resolved the one blocking product decision (iOS auth coordination) via AskUserQuestion: user chose **Sign in with Apple nativo (recomendado)**, on top of keeping email/password + Google/GitHub.
- L5 (2026-11-11): Discovered a concurrent peer session ("zentlet-next-ca") sharing this exact working tree/branch (not an isolated worktree) — it auto-committed `ff6fa20 "feat(category): ..."` containing this session's then-uncommitted T1 category files, and has its own unrelated in-flight changes under `apps/ios/**` sitting modified/untracked in the same tree. Going forward, this session commits only by explicit path (`apps/api/**`, `odd/**`), never `git add -A`, to avoid sweeping up the other session's work.
- L4 (2026-11-11): Explorer agent mapped apps/web: auth = Better Auth (not next-auth) with Google/GitHub social, no Apple provider configured anywhere, no iOS auth doc; email = Resend behind a port; payments = Mercado Pago, already fully hexagonal (`features/billing/server/{domain,application,infrastructure}`); no queue system, orchestration = Vercel Cron + Next `after()`; logger = Pino behind a port with redaction; cache = ioredis behind a `KeyValueStore` port, Postgres fallback; `docs/architecture.md` is the authoritative target-migration doc and explicitly describes the NestJS mapping (port → provider token, adapter → `@Injectable()`, `index.ts` → `useFactory`). Full Prisma schema inventoried (9 files, ~25 models).
