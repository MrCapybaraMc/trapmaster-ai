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
- No migrations have been applied to any Supabase database; do not apply them to production.
- CI build/lint has been running and earlier runs failed. Latest successful build is not yet confirmed.
- No separate Vercel preview is deployed.
- Daily/traps/library video assets requested by name are missing; see `docs/update-1.0-assets.md`.
- Complete Polish/English translation is not implemented across all legacy and new UI; only the preference, HTML language attribute and shared navigation/countdown labels currently switch.
- Admin active-time metrics, accurate time-spent leaderboard, full public leaderboards, and all analytics aggregation remain incomplete.
- YouTube proof currently accepts a URL, not a direct screenshot upload; human review is implemented, automated AI verification is not.
- Discord worker source is present but requires deployment and server-side secrets before messages can be delivered.
- Owner can send a Supabase password-recovery email and review lock/unlock audit events; enforcing a mandatory reset at next login still requires a secure Auth Admin workflow. Passwords are never readable.
- Existing checkout/payment provider and the new donation, coupon, package expiry, and recipient gift approval flows require integration tests against the isolated beta database.
- Opinions background media and Owner profile image need supplied assets.


## Verification notes
- GitHub Actions has completed successful Next.js production builds for the beta branch.
- The targeted ESLint step for `app/update-1` and the tracked redirect route has passed.
- The full-repository lint command still contains pre-existing legacy lint debt; the workflow reports it as a non-blocking baseline step so beta-specific lint and production builds remain visible separately.
- SQL migrations have been reviewed in code but have not been executed against a beta or production database. Database migration syntax/RLS behavior still needs validation on an isolated beta Supabase project.
