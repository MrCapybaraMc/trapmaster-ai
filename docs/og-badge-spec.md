# TrapMasters — OG badge and exclusive benefits

Status: product specification for the isolated Beta branch. This is not implemented functionality until database authorization, UI, tests and a verified Beta deployment are complete.

## 1. OG badge management

- Add a persistent **OG** badge to the user's account/profile and show it consistently in the account page and relevant public profile surfaces.
- Add OG management to the existing staff panel, using the existing authoritative roles in `user_roles`.
- **Owner** can search/select one account and grant or revoke OG, or choose a separate **„Wszyscy użytkownicy”** action to grant OG to all accounts that exist at the moment of confirmation. The mass action must show the exact affected-account count and require a second confirmation. It must not silently include future registrations.
- **HeadAdmin** can grant or revoke OG for individually selected accounts only. HeadAdmin must not receive the all-users/mass-grant control.
- **Admin** cannot grant, revoke or mass-assign OG.
- Every grant/revoke records actor, target, timestamp, action and optional reason in an immutable audit log. Mass actions record the actor, count and a durable list/snapshot of affected user IDs. Prevent duplicate grants and make retries idempotent.
- Re-check the actor's current role on the server for every action. Never trust a role or permission supplied by the browser.
- OG can be revoked by Owner or HeadAdmin using the same scope rules; revocation removes active benefits immediately but preserves history.

## 2. OG benefits

An account with an active OG badge receives all of the following benefits:

1. **Early access to new traps:** access to eligible new traps approximately 3 days before their public release. The exact release and early-access timestamps are configured per trap by authorized staff. Enforce access server-side; do not reveal protected videos/schematics to non-OG users before public release.
2. **Exclusive private redstone builds:** access to selected private builds created by Kapibara, with a per-build access flag and content page. The catalogue may include projects such as **Pearl Stealer 1.0**.
3. **Pearl Stealer 1.0 project access:** the project description may explain its intended Minecraft function—moving an ender pearl from a configured stasis chamber to a designated coordinate with a one-button action. Access is to the build, documentation and any associated media that the creator has marked as OG-exclusive. Do not promise compatibility with every server/version; list tested versions and limitations for each build. Any interactive controls must be constrained to the configured build/coordinates and permissions, not arbitrary access to other players' protected areas.
4. **Package discount:** 8% off every eligible TrapMasters package.
5. **Daily Points bonus:** 15% more Daily Points for each eligible daily claim.
6. **Account enchanting discount:** 15% off account-enchantment costs.
7. **Account enchanting luck:** +10% luck for account-enchantment rolls.
8. **Secret music download:** access to a private download section in the TrapMasters panel for secret music files that TrapMasters is authorized to distribute. Keep files private to OG users, use authenticated short-lived download links, and do not upload or distribute music without the necessary rights.

## 3. Pricing and reward calculation rules

- All OG benefits are calculated server-side from the user's current active OG entitlement. Never accept a discounted price, Daily reward amount, or luck modifier from the client.
- Package discount: apply the OG 8% discount to the current eligible package price. Show base price, OG discount and final price before checkout. Apply configured maximum-discount rules so discounts cannot exceed the allowed cap; clearly show when a cap applies.
- Daily Points: increase the normal eligible claim reward by 15%, using one centrally defined rounding rule. Show the base reward and OG bonus in the claim UI/history. Do not grant the bonus twice on retries or repeated claims.
- Account enchanting: apply the OG 15% discount to the eligible account-enchantment cost and add +10 percentage points to the server-defined enchant luck calculation. Show the cost breakdown and make the chance calculation consistent between preview and actual roll.
- Define how OG combines with other enchant/event discounts and luck bonuses in one central server-side calculation. Do not multiply or add the same modifier twice. Respect existing discount/luck caps and document the final order of operations.
- If an OG badge is revoked, future calculations stop receiving the benefits immediately. Already completed purchases, claimed rewards and already released public content are not retroactively changed.

## 4. UI and notifications

- Show an OG badge and a short benefits summary on the user's account page.
- In the staff panel, show current OG status, who granted it, when it was granted, and the available grant/revoke actions allowed by role.
- Add an OG-only section to the TrapMasters panel containing eligible early-access traps, private redstone builds and authorized secret music downloads.
- For early-access traps, show the scheduled public release date so users understand the three-day preview window.
- Provide Polish and English translations for the badge, benefits, errors, access-denied states and staff actions.

## 5. Acceptance tests

1. Owner can grant/revoke OG for one selected account.
2. Owner can grant OG to all accounts existing at confirmation, with a count preview, explicit confirmation and audit snapshot.
3. HeadAdmin can grant/revoke OG only for individually selected accounts; mass assignment is denied server-side.
4. Admin and ordinary users cannot grant/revoke OG.
5. Duplicate grants and repeated requests do not create duplicate active entitlements or duplicate audit effects.
6. A non-OG user cannot access early traps before their public release; an OG user can access them during the configured approximately three-day window.
7. Private redstone build pages/files are protected server-side and respect each build's OG access flag.
8. Package checkout calculates and displays the 8% OG discount server-side.
9. Daily claim grants exactly the configured 15% bonus once per eligible claim.
10. Account enchanting applies the 15% cost discount and +10 percentage-point luck modifier once, respecting global caps.
11. Revoking OG removes future benefits immediately and preserves the audit history.
12. Secret music download links require an active OG entitlement, expire, and cannot be shared as permanent public URLs.
13. Polish/English UI and all pricing/reward combinations are tested against other active enchant and event modifiers.
14. All changes and tests use only the Beta branch and Beta Supabase project `owzyzfltwronhxbsrccd`; never modify production project `ogroffplttjcdfmrsrpe`.