# TrapMasters Update 1.0 — implementation plan

## Safety and release boundary

- All work in this branch is based on `beta.09`.
- Branch: `feature/trapmasters-update-1.0`.
- Never merge this branch into `main` as part of implementation.
- Never run migrations against the existing production Supabase project.
- Preview deployments must use a separate Vercel project and a separate Supabase project/database.
- Do not copy production service-role keys or expose secrets in client code.
- Production release requires the site owner's explicit approval after preview testing.

## Existing application baseline

- Next.js 16 / React 19 App Router.
- Supabase browser client in `lib/supabase/client.js`.
- Main site and several account/admin flows currently live in large route components.
- Existing database migrations include admin roles, package entitlements, coupons and recruitment review.
- The current admin schema stores one role per account; Update 1.0 requires multiple simultaneous roles. This must be migrated deliberately rather than patched in the UI.

## Delivery phases

### Phase 0 — isolate and map (baseline complete; validation ongoing)
- Create this feature branch from `beta.09`.
- Inventory routes, components, migrations, existing RLS policies and RPC functions.
- Identify all current role and access checks before changing authorization.

### Phase 1 — trap catalog foundation (schema and first UI pass added; review, RLS and full acceptance testing still required)
- Design normalized trap records, media/schematic metadata, filter attributes and creator ownership.
- Add reviews, favorites, recently viewed, comparisons and bug reports.
- Add server-enforced permissions: TrapCreators can create/edit their own records but cannot delete; Admin/HeadAdmin/Owner can moderate according to role hierarchy.
- Ensure trap cards and detail view share the same record and never duplicate entries.
- Keep backups as a separate collection and enforce Puller restrictions server-side.

### Phase 2 — role and profile foundation (multi-role RPCs and creator profile directory added; migration validation still required)
- Support multiple roles per account without downgrading existing Owner/Admin permissions.
- Add TrapCreator profiles and profile moderation.
- Keep all role grants/revocations in server-validated RPCs or server routes; never trust client-supplied role names.

### Phase 3 — proposals, reports and creator chat (initial forms, chat, notifications and moderation workflows added; end-to-end testing pending)
- Trap proposals, website feature proposals, bug reports and notifications.
- TrapCreators-only group chat with server-side access checks and history.

### Phase 4 — Daily, account and package experience (initial points transfer, package countdown, gift-order and SuperCombo flows added; checkout integration testing pending)
- Daily points, transfer limits and immutable transfer history.
- Achievements, favorites, recent activity and package countdowns.
- Preserve existing order and payment logic unless explicitly migrated and tested.

### Phase 5 — Owner/HeadAdmin administration (initial admin UI, roles, store settings, events, partnerships, collaboration, tracked links and Discord outbox added; full permissions and stats validation pending)
- Events, partnerships, collaboration applications, tracked links, discount/SuperCombo configuration and administration statistics.
- Passwords remain unreadable; provide secure reset, lock/unlock and audit controls instead.

### Phase 6 — localization, accessibility and verification (not complete; CI currently reports existing lint failures and beta changes are still being corrected)
- Complete Polish/English coverage for every new UI state, form, notification and error.
- Verify responsive behavior, loading/empty/error states, authorization boundaries and RLS.
- Run lint/build and review migration SQL before preview deployment.

## Definition of done

- No production branch or production database changes.
- Preview uses isolated configuration and database.
- Every write operation is protected by server-side authorization and RLS.
- Role hierarchy and ownership rules are covered by tests.
- No secret, password hash, service-role key or webhook secret is exposed to the browser.
- User reviews the preview and explicitly approves any production release.


## Current beta implementation snapshot (2026-11-24)

Added on `feature/trapmasters-update-1.0`:
- Multi-role schema and owner/headadmin role-management RPCs.
- Trap catalogue, library/backup collections, trap filters, extra-video metadata, creator editing, staff moderation, reviews, favorites, views, downloads, comparisons and bug reports.
- Trap proposals, site proposals, creator chat, collaboration applications, notification records and Discord outbox worker source.
- Daily point transfer RPC with 80% cap and two-day cooldown, achievements tables, account page, package countdown, gift-order RPC and SuperCombo redemption.
- Opinions page, YouTube reward review and recipient-bound discount codes.
- Configurable checkout with additive coupon stacking, usage limits, package prices, payment recipient, optional minimum donation, gift orders and no-self-approval guard.
- Public partner directory, announcements banner, beta visit/page-view metrics, paid-user leaderboards, staff activity chart, and account security audit/reset-email controls.
- Achievement-triggered Daily Points rewards, first-use review reminders, admin reply notifications, and a secret-protected Discord outbox worker.
- Events, partnerships, announcements, tracked links and redirect route.
- TrapCreator directory/profile editing and owner profile upsert RPC.
- Beta-only build/lint workflow trigger.

Not yet complete or not yet verified:
- The isolated beta Supabase project `owzyzfltwronhxbsrccd` has the Update 1.0 schema (56 public tables, RLS enabled) and a recorded beta-only security-definer execution lockdown migration. Migration history before that lockdown was empty because earlier schema work had been applied directly; reconcile the full schema into a clean baseline migration before using automated migration replay. Production Supabase remains untouched.
- Earlier CI runs included successful Next.js production builds and targeted lint, but every subsequent code change still requires a fresh build and preview verification.
- Beta preview deployment status must be checked per latest commit; Vercel API access may prevent direct verification.
- Daily/traps/library video assets requested by name are missing; see `docs/update-1.0-assets.md`. The existing `ender-bg.mp4` is used as a temporary visual background only.
- Complete Polish/English translation is not implemented across all legacy and new UI; only the preference, HTML language attribute and shared navigation/countdown labels currently switch.
- Admin active-time metrics, accurate time-spent leaderboard, full public leaderboards, and all analytics aggregation remain incomplete.
- YouTube proof currently accepts a URL, not a direct screenshot upload; human review is implemented, automated AI verification is not.
- Discord worker source is present but requires deployment and server-side secrets before messages can be delivered.
- Beta login/register routes now link from the legacy homepage; password reset email flow and recovery-password update UI are implemented. No beta auth users existed at last database check, so a real account sign-in still needs an end-to-end user test. Mandatory reset at next login still requires a secure Auth Admin workflow. Passwords are never readable.
- Existing checkout/payment provider and the new donation, coupon, package expiry, and recipient gift approval flows require integration tests against the isolated beta database.
- Opinions background media and Owner profile image need supplied assets.


## Verification notes
- GitHub Actions has completed successful Next.js production builds for the beta branch.
- The targeted ESLint step for `app/update-1` and the tracked redirect route has passed.
- The full-repository lint command still contains pre-existing legacy lint debt; the workflow reports it as a non-blocking baseline step so beta-specific lint and production builds remain visible separately.
- The beta schema is present in the isolated beta database, but earlier changes were applied directly rather than through a reconciled migration history. A clean baseline and replay test are still required before relying on automated migration replay. No production database migration was run.
\n\n## Latest work (2026-11-25)\n\n- Restored the legacy homepage component on the beta branch and added a link to the Update 1.0 trap library.\n- Added beta login links, password reset flow, and email-confirmation redirect.\n- Added TrapCreator create/edit-own and staff moderation UI gates in the trap catalogue. Database policies still require role-boundary testing.\n- Applied beta-only SECURITY DEFINER execute lockdown: no SECURITY DEFINER routine in `public` remains executable by `anon`; 65 remain executable by `authenticated` and need a routine-by-routine authorization audit. Four RLS-enabled tables intentionally have no direct client policies (`access_revocations`, `daily_access_grants`, `order_reviews`, `tm_discord_outbox`).\n- Latest preview build/runtime not yet confirmed; do not claim all Update 1.0 features are complete.\n

## Verified environment audit (2026-11-25)

- The isolated Supabase project `TrapMasters-Beta` (`owzyzfltwronhxbsrccd`) is `ACTIVE_HEALTHY`; production project `ogroffplttjcdfmrsrpe` was not modified.
- The beta database currently has 56 public base tables. RLS is enabled across the application tables.
- The beta Auth database currently has 0 users and `public.user_roles` has 0 rows. Owner login therefore cannot be end-to-end verified until a beta user is registered and separately granted the Owner role through the intended secure process. No production users or credentials are copied.
- Current privilege audit: 0 public-schema SECURITY DEFINER routines executable by `anon`; 65 executable by `authenticated`. These require routine-by-routine authorization review; blanket revocation would break legitimate RPCs and is not safe.
- Four RLS-enabled tables have no client policies: `access_revocations`, `daily_access_grants`, `order_reviews`, and `tm_discord_outbox`. They are currently closed to direct client access; do not add broad policies merely to silence the advisor.
- Supabase advisors still report security/performance findings, including the 65 authenticated SECURITY DEFINER routines, RLS policy performance warnings, and overlapping permissive policies. These remain review items rather than being marked fixed.
- Vercel currently returns no project linked to this repository/branch in the TrapMasters team, and the recorded Beta project ID returns not-found. There is no verified preview deployment for the latest branch commit. Do not create a replacement project without separately configuring and validating its isolated preview environment variables and domains.
- Git comparison reports the feature branch is 159 commits ahead and 27 behind `main`. It must remain isolated; do not merge or rebase it onto production as part of this work.
- The current preview URL is not a verified release artifact. A working beta link may only be published after a successful preview deployment and browser/runtime smoke test.



## Additional requested Beta scope (2026-11-27) — specification only

The following product requirements have been recorded in dedicated specifications; they are **not yet implemented or deployed**:

- Trading Mall: at most 3 active offers created by one user, enforced atomically server-side; direct Daily Points-for-Daily Points trades are forbidden in every direction and API path. See `docs/trading-mall-spec.md`.
- Staff profiles and moderation: Admin/HeadAdmin/Owner see profile nickname and avatar; only HeadAdmin/Owner may receive email data. All three staff roles can issue reasoned warnings and temporary bans in whole hours. Unacknowledged warnings block protected site actions until the user presses „Zrozumiałem”; staff can see the acknowledgement timestamp. Banned users are blocked from normal site features except the narrowly scoped Daily Points claim. Only HeadAdmin/Owner can revoke bans from the dedicated banned-users list. All actions require server-side authorization, audit history and RLS. See `docs/admin-moderation-spec.md`.
- Purchase flow: package/enchant price snapshots, generated order-bound payment command and optional private payment recording upload under „Jeśli chcesz szybciej”. See `docs/purchase-enchantments-expedite-spec.md`.

Previously documented Update 1.0 scope remains required and must be checked before release:
- Enchanting Table tiers, enchant pools/effects, account enchant display and persistent unactivated TrapMaster reward.
- Trading Mall offer/acceptance/history, atomic asset settlement, package payment redemption, staff oversight and localization.
- Package download allowances (5/day, 7/day, 10/day, 15/day), Długość duration calculations and Owner pricing controls.
- Admin/HeadAdmin/Owner controls for enchants, Daily Points, quotas, events and store settings according to the existing permission model.
- Optional purchase proof upload and staff purchase review.
- Polish/English coverage, official supplied logo in navigation/footer/loading state, and all previously listed trap library/account/creator/notification/Discord/analytics requirements in this plan and linked specifications.

Release checklist must reference every acceptance test in the linked specifications. Documentation commits do not count as feature completion. Implement and verify each item only on the Beta branch and isolated Beta Supabase project; never change main or production.


## OG badge and exclusive benefits (2026-11-27) — specification only

- Owner can grant/revoke OG to one selected account or all accounts existing at a confirmed moment; HeadAdmin can grant/revoke selected accounts individually only; Admin cannot manage OG.
- OG benefits: approximately 3-day early access to configured new traps; access to selected private Kapibara redstone builds (including the Pearl Stealer 1.0 project page/build); 8% off eligible packages; +15% Daily Points per eligible daily claim; 15% off account enchanting; +10 percentage points account-enchant luck; and private downloads of music TrapMasters is authorized to distribute.
- All benefit calculations and protected content access are server-side, audited and role/entitlement checked. See `docs/og-badge-spec.md`.
- OG mass grants require Owner-only explicit confirmation and an audit snapshot of the accounts affected. Future registrations are not automatically included.
- This is a specification addition only; it is not implemented or deployed until the acceptance tests pass on Beta.


## Daily streak rewards and activity leaderboard (2026-11-27) — specification only

- Daily milestone bonuses are account-specific: after four consecutive successful Daily claims, the fifth consecutive claim grants the configured day-5 bonus only to that account. A missed Daily period breaks the active claim streak; the next claim starts at day 1.
- Add a statistics leaderboard for longest consecutive activity streaks. A qualifying day requires both a server-recorded login and a successful Daily claim in that same Daily period.
- Track current and historical longest streaks, milestone rewards and claim/login periods server-side; make claims and bonus grants atomic and idempotent. Do not expose private account data in the public leaderboard.
- Exact bonus amount and any later recurring milestones must be configurable and approved before implementation; do not assume an amount. Coordinate reward calculation with existing OG Daily +15% and Daily enchantment modifiers without double-counting.
- See `docs/daily-streaks-spec.md`. This is a specification addition only, not implemented or deployed.


## Account enchant inventory, Kapibarątko and rolling Daily (2026-11-27) — specification only

- Account enchant inventory: at most 6 distinct owned enchant types; at most 3 equipped at once. Only equipped enchants apply. Server-side limits, explicit replacement choice when full, and shared UI catalogue are required.
- Add Best-tier 1,000-point enchant **Kapibarątko** (no level; brown capybara-inspired appearance): while equipped, −5% on every eligible package, +5% package duration, +5% Daily Points reward and −5% Daily waiting time. Its Best-pool probability must be configured, not guessed. See docs/enchanting-table-spec.md.
- Daily becomes a personal rolling 24-hour schedule from the previous successful claim, not a midnight reset. Show a countdown to the next eligible claim in the Daily tab. Streaks and the combined login+Daily leaderboard use personal claim cycles, not calendar dates. See docs/daily-streaks-spec.md.
- The existing day-5 streak bonus is account-specific and requires four consecutive successful personal Daily cycles before the fifth claim; exact bonus amount remains to be configured.
- The enchanting specification contains the unified user-facing list of all enchant types and effects. These changes are specification-only, not implemented or deployed.


## Enchant currency discounts and Enchantowiec revision (2026-11-27) — specification only

- Zniżka I–V discounts eligible package purchases paid with either Daily Points or server dollars, at 5% per level (up to 25%), subject to centrally enforced caps and server-side checkout calculation.
- Enchantowiec now has exactly two levels: I grants one additional attempt in the 350-Daily-Point Basic / Słabe losowanie tier; II grants one additional attempt in the 600-Daily-Point Medium / Średnie losowanie tier. It grants no Best-tier attempt; levels III–VI are removed.
- The exact reset/consumption cadence for Enchantowiec's additional attempt must be confirmed before implementation; do not assume whether it is per roll or a separately granted use.
- See `docs/enchanting-table-spec.md`. This is a documentation update only; no application code, database migration or deployment was performed.


## Owner/HeadAdmin Daily Points management (2026-11-27) — specification only

- Add an admin-panel tool for **Owner and HeadAdmin** to manage a selected user's Daily Points.
- Provide two distinct operations: **Dodaj punkty** (credit an exact amount) and **Ustaw saldo** (set an exact target balance by recording the calculated signed difference).
- Require a reason and a confirmation preview. Every operation must create an immutable, auditable ledger entry; never overwrite or erase historical ledger records.
- Enforce role checks server-side: Owner/HeadAdmin allowed; Admin and ordinary users denied. Make balance calculation and ledger write atomic and idempotent.
- See docs/enchanting-table-spec.md. Documentation only; no application code, database migration or deployment was performed.


## Beta release readiness audit (2026-11-27)

- Added `docs/beta-release-readiness.md` with verified current environment state, implementation gaps, Supabase security audit notes and exact owner actions to unblock a real preview.
- Confirmed the Beta Supabase project is healthy but has no Auth users; its migration history has only the Beta security-definer lockdown migration and requires a reconciled baseline before automated replay.
- Confirmed there is no linked Vercel Git project or preview deployment for the Beta branch. Creating a new Vercel project through the connected tool returned HTTP 403 (insufficient permission); no project/deployment or production-domain change was made.
- Confirmed current Daily code still uses UTC calendar-date eligibility, and the Beta schema has two separate points balances (`profiles.points` and `daily_points.balance`). These must be reconciled before safely implementing rolling Daily or staff point adjustments.
- Current release state: **not ready for public Beta testing**. See the readiness audit for owner steps and release gates.
