# Daily streaks and consecutive-activity leaderboard — Beta specification

Status: product specification only. No application code, database migration, or deployment is included in this document.

## 1. Per-account Daily streak rewards

- Daily streaks are tracked independently for each account. A streak or milestone reached by one account must never grant points to other accounts.
- A streak day counts only when that account successfully claims its Daily reward on that calendar day. Merely opening the Daily page or seeing the claim button does not count.
- Use the exact same server-authoritative Daily reset boundary/timezone already used by the existing Daily claim system. Do not let the browser choose the claim date or timezone.
- A successful claim increments the account's consecutive-claim streak by one. A second claim for the same Daily period must be rejected/idempotent and must not increment the streak twice.
- If an eligible Daily period passes without a successful claim, the active streak resets when the next claim is made; that next claim starts a new streak at day 1.
- Example: claims on four consecutive Daily periods produce a 4-day streak. The claim on the fifth consecutive period reaches day 5 and grants the configured day-5 bonus to that account only.
- Milestone bonus amounts and milestone intervals must be configurable by authorized staff, with safe server-side defaults. The initial requested milestone is day 5. The product owner must set the exact bonus amount before implementation; do not invent an amount.
- Define whether rewards repeat at later milestones (for example days 10, 15, 20) through configuration. A milestone can be granted only once per account per streak/milestone; retries, refreshes, concurrent requests, and duplicate RPC calls must not duplicate points.
- The regular Daily reward and streak bonus must be recorded separately in immutable reward/ledger history so the user and staff can see the breakdown.
- If a streak breaks, historical longest streak and already-earned rewards remain unchanged. Only the current streak resets.
- Display current streak, longest streak, next milestone, and the bonus amount/rule clearly in the Daily UI. Explain the reset boundary so users know when a day rolls over.

## 2. Daily streak leaderboard in statistics

- Add a statistics leaderboard for the longest consecutive streak of daily activity.
- A qualifying day requires both: (1) a successful account login recorded by the server, and (2) a successful Daily claim, within the same Daily calendar period.
- A day with only a login or only a Daily claim does not qualify for this combined leaderboard streak.
- Consecutive qualifying Daily periods form the streak. A missed period breaks the active streak; retain the historical longest streak.
- Show at least rank, public nickname, avatar, and longest qualifying streak in days. Do not expose email addresses or private account data in the public leaderboard.
- Provide deterministic tie-breaking (for example, earlier timestamp of reaching the same record, then stable account ID) and pagination.
- Keep this leaderboard distinct from any future login-only or claim-only rankings; label it clearly as consecutive days with both login and Daily claim.
- Apply existing privacy/visibility and account eligibility rules. Do not include banned/deleted/hidden accounts unless the product's existing public leaderboard policy explicitly permits them.

## 3. Data integrity, security and acceptance tests

- Store claim periods and login activity using server timestamps and the existing Daily period definition. Never trust client-supplied streak counts, claim dates, reward amounts, or leaderboard values.
- Update the claim, streak, milestone ledger and relevant statistics atomically in a server-side transaction/RPC. Use unique constraints/idempotency keys for (account, Daily period) claims and (account, streak, milestone) rewards.
- Ensure concurrent claims cannot double-increment a streak or award a milestone twice.
- Do not award milestone bonuses retroactively to accounts whose historical data is incomplete or cannot reliably prove consecutive claims.
- Add tests for days 1–4, day 5 bonus, a missed day, a new streak after a gap, duplicate and concurrent claims, repeated milestones, account isolation, reset-boundary behavior, login-without-claim, claim-without-login, and leaderboard tie-breaking/privacy.
- Verify that existing Daily cooldowns, Daily multipliers, OG +15% Daily benefit, and Daily-related enchantments compose according to explicit server-side calculation order without double-counting or allowing negative/overflow values. Show regular reward, each modifier and streak bonus as separately explainable line items.
- Add Polish and English translations for the Daily streak UI, milestone notices, leaderboard and errors.

## 4. Release boundary

This specification is for the isolated Beta branch and Beta database only. It is not implemented or deployed. Do not modify `main` or the production Supabase project. Implementation requires tests and preview verification before any production-release decision.
