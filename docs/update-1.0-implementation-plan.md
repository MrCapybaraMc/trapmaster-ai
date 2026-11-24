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

### Phase 0 — isolate and map (in progress)
- Create this feature branch from `beta.09`.
- Inventory routes, components, migrations, existing RLS policies and RPC functions.
- Identify all current role and access checks before changing authorization.

### Phase 1 — trap catalog foundation
- Design normalized trap records, media/schematic metadata, filter attributes and creator ownership.
- Add reviews, favorites, recently viewed, comparisons and bug reports.
- Add server-enforced permissions: TrapCreators can create/edit their own records but cannot delete; Admin/HeadAdmin/Owner can moderate according to role hierarchy.
- Ensure trap cards and detail view share the same record and never duplicate entries.
- Keep backups as a separate collection and enforce Puller restrictions server-side.

### Phase 2 — role and profile foundation
- Support multiple roles per account without downgrading existing Owner/Admin permissions.
- Add TrapCreator profiles and profile moderation.
- Keep all role grants/revocations in server-validated RPCs or server routes; never trust client-supplied role names.

### Phase 3 — proposals, reports and creator chat
- Trap proposals, website feature proposals, bug reports and notifications.
- TrapCreators-only group chat with server-side access checks and history.

### Phase 4 — Daily, account and package experience
- Daily points, transfer limits and immutable transfer history.
- Achievements, favorites, recent activity and package countdowns.
- Preserve existing order and payment logic unless explicitly migrated and tested.

### Phase 5 — Owner/HeadAdmin administration
- Events, partnerships, collaboration applications, tracked links, discount/SuperCombo configuration and administration statistics.
- Passwords remain unreadable; provide secure reset, lock/unlock and audit controls instead.

### Phase 6 — localization, accessibility and verification
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
