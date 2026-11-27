# TrapMasters Beta — release readiness audit

Audit date: 2026-11-27  
Scope: `feature/trapmasters-update-1.0`, isolated Supabase Beta and the TrapMasters Vercel team.  
Production boundary: `main`, `trapmasters.pl`, `www.trapmasters.pl` and production Supabase project `ogroffplttjcdfmrsrpe` are out of scope and must not be changed.

## Verified environment

- GitHub repository: `MrCapybaraMc/trapmaster-ai`.
- Intended Beta branch: `feature/trapmasters-update-1.0`.
- Supabase Beta project `owzyzfltwronhxbsrccd` (TrapMasters-Beta) reports `ACTIVE_HEALTHY`, PostgreSQL 17.
- Supabase Beta currently has no Auth users and no staff role rows, so no real user login, staff authorization or end-to-end account flow can yet be verified.
- Supabase migration history contains only `20261125090143_beta_security_definer_execute_lockdown`. Earlier schema work was applied directly; a complete reproducible baseline/replay must be prepared before automated migration replay is trusted.
- The Vercel team lookup returned no linked Git projects. Team project listing returned zero projects and branch-filtered deployment history returned zero deployments.
- Vercel project creation was attempted for a separate `trapmaster-beta` project, with only the Beta Supabase public URL and publishable key. Vercel rejected project creation with HTTP 403 (no permission). No project or deployment was created. No production domains were assigned.
- The repository's Supabase browser client expects `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; the values for the isolated Beta project are available from the Beta Supabase dashboard and must be configured only on the Beta Vercel project.

## Confirmed implementation gaps

### Daily and points

- Current `public.claim_daily_reward()` uses a UTC calendar date and `profiles.last_daily_claim date`; it does not implement the requested rolling 24-hour schedule.
- Current account UI checks eligibility by comparing `last_daily_claim` to today's browser date. This is not a trustworthy 24-hour countdown and must be replaced with a server-provided `next_claim_at`.
- The current claim RPC awards fixed calendar-streak amounts (50/100/150) and does not implement the newly requested account-specific day-5 configurable bonus, personal 24-hour streak cycles, or combined login + Daily leaderboard.
- There are two separate point balance representations in the Beta schema: `profiles.points` (used by the current account Daily UI and claim RPC) and `daily_points.balance` (used by point transfers). They must be reconciled into one canonical balance/ledger before adding staff adjustments, enchant purchases, or other new point spending. Do not update either balance directly from the browser.
- Owner/HeadAdmin Daily Points controls are specified but not implemented. They require a single server-side transactional adjustment operation, immutable ledger history, reason, actor/target audit data, idempotency, and strict Owner/HeadAdmin checks. Admin must be denied.

### Enchanting and purchases

- Enchanting Table, inventory/equipment (6 owned / 3 equipped), Kapibarątko, revised Enchantowiec I–II and Zniżka across Daily Points/server dollars are documented, not implemented in application code or database.
- Enchantowiec additional-attempt reset/consumption cadence remains a product decision and must be confirmed before coding.
- Probability tables, stacking order, caps, rounding, package discount composition and exact Kapibarątko chance remain to be configured; do not invent values.
- Order schema currently has no enchant/discount price snapshots or private optional payment-proof storage fields. Purchase/enchant expedited workflow is specification-only.
- No payment provider integration or real payment/entitlement end-to-end verification is confirmed.

### Trading and moderation

- Trading Mall's 3-active-offer limit and Daily Points-for-Daily Points prohibition are specification-only.
- Staff directory privacy rules, warning acknowledgement gate, temporary bans, Daily-only ban exception and HeadAdmin/Owner unban controls are specification-only.
- These require database-backed atomic operations, server-side authorization and negative tests; UI-only role hiding is insufficient.

### Other release gaps

- Complete Polish/English localization is incomplete.
- Requested media assets `daily.mp4`, `traps.mp4` and `liblary.mp4` are missing; do not substitute unrelated files while claiming the requested assets are present.
- Discord outbox delivery requires deployment and server-side secrets configured by the project owner. Never commit or request secrets in chat.
- Full build, lint, migration replay, RLS tests, real-account smoke tests and a live Beta preview verification remain required.

## Supabase security audit notes

- The security advisor reports 65 authenticated-executable `SECURITY DEFINER` routines. Each must be reviewed individually for actor authorization, target ownership, fixed search_path, input validation and intended grants. Do not apply a blanket revoke.
- Four tables have RLS enabled but no direct client policies: `access_revocations`, `daily_access_grants`, `order_reviews` and `tm_discord_outbox`. These were intentionally closed to direct client access; do not add broad policies just to silence the advisor.
- Advisors also report RLS policy performance findings and overlapping permissive policies. Review and consolidate only after confirming equivalent access behavior with tests.
- See the Supabase advisor dashboard for the current full findings; this document summarizes, not replaces, that review.

## Required owner actions to unblock a real Beta preview

1. In Vercel, create a **new project** named `trapmaster-beta` inside the **TrapMasters** team, or ask a team Owner to grant the required project-creation permission. Do not import or alter the existing production project.
2. Connect `MrCapybaraMc/trapmaster-ai` and set the Beta project's **Production Branch** to `feature/trapmasters-update-1.0`. Do not assign `trapmasters.pl` or `www.trapmasters.pl`.
3. Configure only these public Beta environment variables in the new Beta Vercel project:
   - `NEXT_PUBLIC_SUPABASE_URL=https://owzyzfltwronhxbsrccd.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: obtain the current publishable key from the Beta Supabase project's API Keys page. Never use a production key.
4. Trigger a deployment from `feature/trapmasters-update-1.0`; wait for `Ready`; open the generated `.vercel.app` URL and complete the smoke tests.
5. Register a fresh Beta test account, then use the intended secure process to grant the first Beta Owner role. Do not copy production accounts or credentials.
6. Before enabling economy/admin features, reconcile the points balance model and migration baseline, then test all authorization and ledger paths on Beta.

## Release decision

**Not ready for public Beta testing yet.** The application code contains a substantial Update 1.0 foundation, and the feature branch has extensive specifications, but the latest isolated Vercel project/preview does not exist and core Daily/economy requirements are not implemented. Do not present this as a completed or deployed Beta release.

A release may be called Beta-ready only after a successful deployment from the specified feature branch, isolated Beta environment variables, at least one newly registered Beta account, passing build/security/authorization/integration tests, and a browser smoke test of the actual preview URL.
