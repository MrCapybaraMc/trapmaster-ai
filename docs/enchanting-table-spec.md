# TrapMasters — Enchanting Table and account progression specification

Status: product specification added to the isolated Beta feature branch. This is not yet implemented code and must not be presented as a working feature until the database, server actions, UI, tests and preview are complete.

## 1. Navigation and visual direction

- Add an **Enchanting table** tab immediately beside **Daily**.
- Give it a Minecraft-inspired enchanting-table presentation: dark/purple magical atmosphere, rune-like details, three selectable tiers and a result reveal.
- Animation quality scales with the selected tier: Basic = short/simple reveal; Medium = longer reveal with more effects; Best = premium multi-stage reveal. Keep animations skippable/reduced-motion accessible and never delay server-side result confirmation.
- Show the user's currently active account enchants, remaining rerolls and Daily Points balance.
- Add a collapsible **Rozwiń listę enchantów** section describing every enchant, level range and exact effect.
- In account information add an **Enchanty konta** section. It must show the same canonical active enchant records as the Enchanting Table.

## 2. Enchanting tiers and prices

| Tier | Price before discounts | Pool |
|---|---:|---|
| Słabe losowanie | 350 Daily Points | Basic pool |
| Średnie losowanie | 600 Daily Points | Basic enchant types with expanded level ranges, plus Ciekawicz |
| Duże losowanie | 1,000 Daily Points | Full pool, high levels, plus TrapMaster special drop |

- Premium enchant reduces the Daily Point cost of enchant rolls by 10% per level. Apply the discount server-side and display the final price before confirmation.
- Define explicit, server-owned probability tables per tier. The Best-tier TrapMaster special result has a 10% drop chance; probabilities for all other outcomes must be configured so the complete table totals exactly 100%.
- Do not let the client choose or influence random outcomes. Use a cryptographically secure server-side random selection and record the selected pool version and roll result.
- Charge points and persist the result atomically. A failed transaction must not charge points; retries must be idempotent.
- Each enchant type has one active account value. A new roll of a type always replaces the previous level, including when the new level is equal or lower. Do not silently keep the higher level.
- Enchantowiec adds rerolls to the same paid roll: level 1 gives 2 total result attempts; level 2 gives 3 total attempts. The user may choose which attempt to keep; only the final selected result is applied. If the user does not choose, apply the last attempt after a clearly shown timeout. Confirm whether each reroll is free within that paid roll (default: yes).

## 3. Enchant catalogue and effects

All percentages below are additive percentage modifiers to the relevant base value unless otherwise stated. The server must define rounding, caps, stacking order and minimum/maximum bounds centrally.

### Basic pool — Słabe losowanie

- **Zniżka I–II**: each level gives 5% discount on eligible package purchases made with Daily Points. Level II = 10%. Highest possible level in the full system is V, not VI.
- **Długość I–II**: each level extends the purchased package's duration by 5%; level II = 10%.
- **Premium I**: reduces the Daily Point cost of enchanting by 10% and gives a 10% discount on all TrapMasters packages purchased with Daily Points.
- **Enchantowiec I–II**: level I gives 2 total attempts per paid roll; level II gives 3 total attempts. This is the rarest Basic-pool result.
- **Słabość I–II**: each level increases the total Daily cooldown by 5%; level II = 10%. This is a drawback and must be visibly marked as such.
- **Daily I–III**: each level increases the Daily Points reward by 5% per Daily claim; level III = 15%.
- **Lucky I–II**: each level adds 5% relative luck weight toward better outcomes. Do not treat this as an unbounded absolute percentage-point increase; define a capped, normalized server-side weighting formula.

### Medium pool

- Includes every Basic enchant type, with up to two additional levels over its Basic maximum. Examples: Lucky I–IV, Długość I–IV, Słabość I–IV, Daily I–V, Enchantowiec I–IV, Premium I–III. Zniżka is still capped at V globally.
- Adds **Ciekawicz I–III**:
  - I: preview the TrapMasters interface and navigation, read-only; no selecting, submitting, downloading or other mutations.
  - II: everything in I plus browse the complete trap library as names only; no videos, schematics or downloads.
  - III: everything in II plus watch trap videos and read instructions; schematics/downloads remain blocked.
- Ciekawicz permissions must be enforced on the server and on every content endpoint, not only hidden in the UI.

### Best pool

- All regular enchant types are available up to level VI, except Zniżka which remains capped at V. Ciekawicz remains capped at III.
- Adds **TrapMaster** (no level): on drop, grant one hour of TrapMasters access and a maximum of two schematic downloads during that entitlement. The entitlement must expire automatically and the download counter must be enforced server-side.
- TrapMaster result presentation: celebratory confetti and a prominent congratulatory message addressed using the user's public display name (never email). Respect reduced-motion settings. The special drop must not grant permanent access.

## 4. Package entitlements and daily schematic downloads

Show the included daily schematic download allowance directly on each package card and in checkout:

| Package term | Schematic downloads per day |
|---|---:|
| 1 day | 5 |
| 1 week | 7 |
| 1 month | 10 |
| Lifetime | 15 |

- The allowance is a per-account, per-day server-enforced quota, not a client-side counter.
- Package upgrades, renewals, gifts and overlapping entitlements need a documented precedence rule to prevent quota multiplication. Default proposal: use the highest active package allowance, not the sum.
- Owner/HeadAdmin may set an account-specific daily schematic allowance override. Store the override with actor, reason, timestamps and audit history.
- TrapMaster's temporary two-download entitlement is separate and must not bypass package or account restrictions in a way that permits unlimited downloads.

## 5. Account enchant management and administrative tools

Add an Owner/HeadAdmin-only administration panel with:
- Search account by username or email (email is lookup-only and must not be exposed in public views).
- Grant/revoke an enchant and set an arbitrary level, including levels not obtainable through normal rolls (e.g. Długość XV). Admin grants must be clearly marked as admin-granted in audit records.
- Set or adjust Daily Points with a reason and immutable ledger entry.
- Set per-account daily schematic download allowance.
- View current enchants, entitlements, Daily balance and full change history.
- All actions require server-side role verification. Only Owner/HeadAdmin can access; Admin cannot. Never trust a role or account ID supplied by the browser without rechecking it server-side.

Also add Owner/HeadAdmin store controls:
- Edit package prices and daily schematic allowances without a code deployment.
- Validate prices and quotas, show a preview before saving, and log who changed what and when.
- Keep package pricing and entitlement configuration separate from production and scoped to Beta until explicitly approved.

## 6. Event effects

Extend event administration so Owner/HeadAdmin can configure time-bounded effects, with start/end time, timezone, stacking policy, caps, description and audit log:
- More Daily Points per claim.
- Shorter or longer Daily cooldown.
- Longer package duration at the same price.
- Increased chance/weight for better enchant results.
- Optional other server-defined modifiers.

Event modifiers must be applied on the server, have explicit caps and stacking rules, and be visible to users with an expiry countdown. Expired events must stop affecting calculations automatically. Do not permit event settings to bypass purchase, cooldown, entitlement, or authorization checks.

## 7. Economy and security requirements

- Use an immutable Daily Points ledger; do not directly overwrite balances without a matching ledger entry.
- Calculate price discounts in one shared server-side function. Premium discounts apply to enchanting and package purchases only when paid with Daily Points, never to cash payments.
- Define the order of package duration modifiers, event modifiers and rounding; prevent negative prices, zero-cost loops and unbounded durations.
- Daily reward and cooldown modifiers must be calculated from the base reward/cooldown and capped. Słabość increases the total cooldown; Daily increases points; event and enchant modifiers must not accidentally multiply repeatedly on every refresh.
- Use database transactions/RPCs for rolls, points debit, reroll choice, enchant replacement, quota consumption and entitlement changes.
- Add rate limits and anti-replay/idempotency keys to roll and download endpoints.
- Add RLS and tests proving users can only read their own private account enchants/ledger, while public profile views reveal no private billing or email data.
- Audit all Owner/HeadAdmin grants and store-setting changes.
- Never put service-role keys, webhook secrets or privileged random-selection logic in browser code.

## 8. Acceptance tests before Beta release

1. Each tier charges the correct discounted Daily Point price exactly once.
2. Roll probabilities sum to 100%; Best-tier TrapMaster probability is exactly 10%.
3. Repeated requests/retries cannot double-charge or duplicate entitlements.
4. Same-type enchant always replaces the previous value, including equal/lower levels.
5. Enchantowiec attempts and user selection work as specified.
6. Zniżka never exceeds V through normal rolls; admin-granted levels are separately labelled.
7. Daily, cooldown, package discount and duration calculations are correct with combined enchant/event modifiers and documented caps.
8. All four package quotas display correctly and are enforced across concurrent downloads and timezone boundaries.
9. Ciekawicz I/II/III content access is enforced by server endpoints; schematic downloads remain blocked.
10. TrapMaster grants exactly one hour and at most two schematic downloads, then expires.
11. Owner/HeadAdmin controls work; Admin and ordinary users are denied server-side.
12. Price/quota changes and account grants have complete audit history.
13. Polish/English labels, empty/error/loading states, mobile layout and reduced-motion behavior are tested.
14. Full migration replay, RLS review, build, lint and Beta preview smoke test pass before declaring the feature complete.

## 9. Product decisions to confirm during implementation

- Enchantowiec rerolls are assumed included in the original roll price; only the final selected attempt is applied.
- Package download quota uses the highest active package allowance rather than adding multiple packages together.
- Lucky is a capped relative weight modifier, not a flat percentage-point bonus.
- Event modifiers need explicit caps and stacking policy configured before activation.
- The 10% TrapMaster chance is fixed for the Best pool; remaining Best-pool weights still need a complete probability table.

## Package card and checkout disclosure (2026-11-27)

- Every package card and checkout summary must display its base schematic download allowance: 1 day = 5/day, 1 week = 7/day, 1 month = 10/day, lifetime = 15/day.
- If the account has an active Długość enchant, show a clear per-package preview beside each package: base duration, active enchant level, exact additional time (e.g. +5% / +10%) and final duration after all capped modifiers. Calculate the preview using the same server-side calculation as checkout; never show a client-only estimate that differs from the actual entitlement.
- If multiple duration enchants/events apply, show the combined capped result and disclose the stacking rule. The checkout must revalidate the final duration before charging.
- Display active account enchants and their effects in both the Enchanting Table and account information; both views must read the same canonical server data.
- The TrapMaster special entitlement stays unactivated and tradeable until the user presses the persistent **Aktywuj TrapMaster** action. Activation starts the one-hour timer and two-download allowance; activated entitlements cannot be traded.
