# TrapMasters — Trading Mall, package previews and brand asset specification

Status: product specification for the isolated Beta branch. This document does not mean the feature is already implemented.

## 1. Trading Mall navigation

Add a **Trading Mall** tab beside the Daily and Enchanting Table areas. It contains two sub-tabs:
- **Oczekujące trejdy** — browse other users' currently open trade offers.
- **Zgłoś trejda** — create and manage the signed-in user's own offers.

The interface must be available in Polish and English and follow the account's language setting.

## 2. Create a trade

The creation flow has two matching offer/request sides. Each side contains a dropdown with exactly three asset categories:
1. **Punkty Daily** — choosing it opens a numeric quantity field.
2. **Enchant** — choosing it opens a dropdown of supported enchant types and a level selector where relevant.
3. **TrapMasters** — choosing it opens a dropdown of available package types.

The user selects what they are offering and what they want in return, then submits the trade. A trade can be published only after the server verifies that the creator currently owns every offered asset and that it is eligible for transfer.

Display a clear summary before publishing: "Dajesz" and "Otrzymujesz", including exact quantities, enchant levels and package duration. Prevent zero-value, invalid, self-directed and unsupported offers. The offer creator may cancel an unaccepted offer.

## 3. Pending trades and acceptance

- Oczekujące trejdy lists active offers from other accounts, with filters and a detail view.
- An accepting user must be signed in and must have the requested assets available at acceptance time.
- Recheck both sides immediately before execution. Lock the relevant balances/entitlements to prevent concurrent spending or accepting multiple offers using the same assets.
- Execute both sides as one atomic database transaction: either all assets move or none do. Never transfer one side first and leave the other side unpaid.
- Daily Points transfer must create immutable debit/credit ledger entries.
- Enchant transfer must preserve type, level, source, and provenance; remove it from the seller and attach it to the buyer in the same transaction. Define policy for admin-granted, temporary and bound enchants; default: non-transferable unless explicitly marked transferable.
- Package transfer must be entitlement-aware and cannot create duplicate package activation, extend expiry unexpectedly, or bypass account limits.
- If the requested TrapMasters package is accepted, show the original offer creator a notification: **"Trade zaakceptowany — opłać TrapMasters"** and provide a copyable, server-generated package payment/redemption command or code. This code must be bound to the exact trade, package, payer and expiry; it must not be a generic reusable command. The trade remains in a clearly defined awaiting-payment state until payment is confirmed. Do not mark the trade complete or transfer the other side's assets before payment is verified.
- Expired, cancelled, rejected or failed offers release any reserved assets and cannot be accepted later.

## 4. Trade states and user history

Use explicit server-side states, for example:
- draft
- open
- reserved/accepting
- awaiting package payment
- completed
- cancelled
- expired
- failed/reversed

Each account's history must show every trade it participated in, including date/time, counterparty display name, exact assets given/received, final state and a trade reference. Do not expose counterparty email addresses.

Notify both parties when a trade is accepted, paid, completed, cancelled, expired or fails. Notifications must be idempotent and must not claim completion before the transaction commits.

## 5. Owner and HeadAdmin oversight

Add Trading Mall visibility to Owner and HeadAdmin administration panels:
- Browse all trades and search/filter by status, user, date and trade reference.
- Inspect both sides, payment state, reservation state, audit history and failure reason.
- Cancel or freeze suspicious offers with a required reason.
- Never allow staff to silently edit a completed trade. Corrections require a separate audited reversal/compensation operation.
- Admin role does not receive these controls unless explicitly added to the role policy.

## 6. Anti-abuse, privacy and security

- Enforce all offer creation, acceptance, cancellation and settlement permissions on the server; client UI checks are not authorization.
- Use database transactions, row locks or equivalent concurrency control, idempotency keys and rate limits.
- Prevent self-trading, duplicate acceptance, replay, negative quantities, currency overflow, stale balances and double-spending.
- Define transferability rules for each asset category. Temporary TrapMaster access and non-transferable entitlements cannot be traded.
- Apply RLS so users see only their own private account history and public open offers; never disclose email, private balances or sensitive account metadata in public listings.
- Keep an immutable audit trail of offer creation, edits, acceptance, settlement, payment confirmation, cancellation, moderation and reversals.
- Provide clear warnings that a trade is final once atomically completed.

## 7. Package duration display and pricing controls

- Whenever a user has a Długość enchant, every eligible package card, package detail and checkout summary must display the active effect, e.g. **"Twój enchant Długość II: +10% czasu pakietu"** and the calculated final duration/expiry date.
- Show the base package duration and modified duration together; do not hide the original duration.
- If multiple modifiers apply (enchant and event), show a transparent breakdown and apply the centrally defined caps/rounding exactly once.
- Owner can change each package's price from the administration panel without a code deployment. Keep this control Beta-only, validate values, require confirmation and write an audit record. HeadAdmin access follows the existing store-setting permission policy; do not silently broaden it.

## 8. Logo and brand usage

Use the user's supplied TrapMasters image as the official Beta brand asset. Preserve the artwork and proportions; do not recreate or alter the wordmark.
- Add an optimized asset at `public/images/trapmasters-logo.jpg` (or an equivalent documented static asset path) and use it in the site header/navigation, footer and loading/splash state where it fits.
- Use a compact crop/contained rendering in the header so it does not dominate navigation; retain the complete square artwork in suitable larger contexts.
- Provide meaningful Polish/English alt text, responsive sizing, and avoid layout shift.
- Do not use the logo as a background behind text where it harms readability. Keep the existing site's design and colors; the purple frame in the supplied image can inform subtle brand accents.
- The source image supplied in chat must be copied into the repository asset path during implementation; a written specification alone does not install the image into the running website.

## 9. Polish/English coverage

Ensure every new Trading Mall state and related package/enchant message supports both languages:
- tabs, dropdowns, labels, validation, confirmations, empty states, errors and notifications;
- package duration breakdown and trade status history;
- Owner/HeadAdmin controls and audit reason prompts.
Use the account's language preference consistently across all routes, including existing pages; avoid mixed-language screens.

## 10. Acceptance tests

1. A user cannot publish an offer for assets they do not own.
2. A user cannot accept an offer unless they can supply the requested assets at that exact moment.
3. Concurrent acceptances/spending cannot double-use the same points, enchant or package.
4. Settlement is all-or-nothing and creates complete ledger/audit records.
5. Package-payment command is single-use, trade-bound, payer-bound and expires; completion only follows verified payment.
6. Both parties see correct notifications and complete history.
7. Owner/HeadAdmin oversight is enforced server-side and every moderation action is audited.
8. Temporary/non-transferable entitlements cannot be traded.
9. Długość enchant and event duration breakdowns appear beside package prices in both languages.
10. Owner price changes persist without deployment and are audited.
11. Polish/English language preference is respected throughout.
12. Logo asset is present in the repository and rendered responsively in selected site locations.
13. Build, lint, migration replay, RLS tests and Beta preview smoke tests pass before release.

## Additional implementation requirements (2026-11-27)

### Secure atomic settlement
- In a single database transaction, lock both accounts and all offered inventory/entitlements; re-check the offer is open, unexpired and not self-accepted.
- Re-check balances, enchant ownership/levels, package eligibility, account restrictions and quota rules immediately before settlement.
- Debit/credit Daily Points through the immutable points ledger; transfer eligible enchant records; transfer only explicitly transferable package entitlements. Never transfer an active non-transferable package or grant a package without a valid entitlement record.
- Mark the offer completed exactly once and write paired immutable history records for both accounts.
- If any check fails, roll back the entire exchange. Unique idempotency keys and row-level locking prevent replay, duplicate items and concurrent acceptance.

### TrapMaster activation and tradeability
- A dropped TrapMaster reward is initially stored as an unactivated account entitlement.
- Display a persistent fixed **Aktywuj TrapMaster** action at the lower-left across routes while the entitlement is available. It must not cover essential controls; on mobile it may collapse into an accessible floating control.
- The user may leave the entitlement unactivated and offer it in Trading Mall. Once activated, it is no longer tradeable.
- Activation starts one-hour access and grants at most two schematic downloads. Expiry and download count are enforced server-side. Activation or transfer can happen only once.

### Package acceptance and redemption
- When a user accepts an offer requesting a TrapMasters package, notify the offer creator with: **„Trade zaakceptowany — opłać za TrapMasters”**.
- Show a copyable, single-use redemption command/code bound to that offer, package type, recipient and expiry.
- The code must not grant access until payment/fulfilment is validated. Redeeming it atomically fulfils the agreed package side and closes the trade. No generic reusable code and no partial transfer.
- Keep an audit trail of command creation, copy/redeem attempts, payment status and final fulfilment.

### Admin, history and localization
- Owner and HeadAdmin can view every offer, pending acceptance, dispute/status and completed trade in the admin panel, with search/filter by status, user display name, item category and date.
- Both parties see completed exchanges in account history with timestamp, counterparty display name, all items on both sides and final status.
- Notify both users on acceptance, cancellation, expiry, dispute and fulfilment.
- Every label, validation error, status, notification and admin view must support Polish and English through the account language preference.
- All mutations require server-side authorization; public listings expose only safe display data. Corrections to completed trades use explicit compensating ledger/entitlement entries, never silent edits.

### Acceptance tests
- Test insufficient balance, stale inventory, expired offers, self-trading, duplicate requests, simultaneous acceptance, account restrictions, role boundaries and transaction rollback.
- Test TrapMaster activation-vs-transfer races and the two-download limit.
- Test redemption code is single-use, recipient-bound and cannot be reused.
- Test Polish/English across all states, responsive/mobile layout and persistent activation action.
