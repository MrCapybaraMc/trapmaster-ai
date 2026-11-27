# TrapMasters — profile administration, warnings and temporary bans

Status: product/security specification for the isolated Beta branch. This is not implemented functionality until database migrations, server-side authorization, UI, tests and a verified Beta deployment are complete.

## 1. Staff user directory and profile cards

- In the existing administration panel, provide a searchable list of all registered users using their public Minecraft/display nickname and profile avatar.
- Admin, HeadAdmin and Owner may view the same basic profile card and available moderation controls.
- **Admin** may see only the user's public nickname and profile avatar in this directory/profile view. Do not return or render email addresses to Admin, including through hidden fields, API responses, search results, exports, logs exposed in the UI or browser network payloads.
- **HeadAdmin and Owner** may additionally view the user's email address.
- Enforce this distinction on the server/query layer, not only by hiding an email column in React. Prefer role-specific server projections/DTOs that omit email entirely for Admin.
- Profile avatars must use the existing safe profile-image source/fallback. Do not expose private storage paths or unrelated account metadata.
- All three roles can open a user's profile and use the warning/ban actions described below, subject to server-side role verification.

## 2. Warnings and acknowledgement

- Add a **„Nadaj ostrzeżenie”** action to each user's staff profile.
- Clicking it opens a modal/dialog with a required reason text area and explicit confirmation. Empty or whitespace-only reasons are rejected.
- Store the warning as a durable moderation record with target user, issuing staff user, reason, created timestamp, status and acknowledgement timestamp.
- On the warned user's next authenticated visit (and immediately if already online through the app's normal refresh/polling mechanism), display a blocking warning dialog containing the exact reason.
- While an unacknowledged warning is active, block normal site actions/navigation that mutate or access protected features. Keep only the minimum session/logout and warning-acknowledgement functionality available. Do not allow the user to bypass the dialog by refreshing or opening another route.
- The user must click **„Zrozumiałem”**. That action records the acknowledgement server-side with timestamp and warning ID. The warning dialog then closes and normal access resumes unless another independent restriction (such as an active ban) applies.
- Staff can see the warning state, reason, issuing staff member, creation time and whether/when the user acknowledged it. The acknowledgement must be visible as proof the user confirmed reading it; it does not mean the user agrees with the warning.
- Preserve warning history. Do not overwrite or silently delete old warnings. Any withdrawal/correction must be a separate audited staff action.
- Acknowledgement endpoint must verify the warning belongs to the signed-in user and is still pending; duplicate acknowledgement requests must be idempotent.

## 3. Temporary bans

- Add a **„Nadaj bana”** action to each user's staff profile for Admin, HeadAdmin and Owner.
- Clicking it opens a confirmation dialog with a required ban reason, required duration in hours entered as a positive whole number within a configured safe maximum, a clear calculated expiry date/time in the user's local timezone, and explicit final confirmation.
- The server computes starts_at and expires_at; never trust a client-submitted expiry timestamp. Reject zero, negative, fractional, malformed and out-of-policy durations.
- Store an immutable ban record with target, issuer, reason, duration, start/end timestamps, status, and audit metadata. Preserve prior expired/revoked bans in history.
- While a ban is active, the user must be unable to use normal site features, including trades, purchases, downloads, uploads, chat, profile changes and other mutations.
- **Explicit exception:** the banned user may still claim/receive their normal Daily Points reward. This exception must be narrowly scoped to the Daily claim operation; it must not grant access to other Daily settings, transfers, rolls, or unrelated features.
- The banned user can log in and view the ban notice/status and expiry, but cannot bypass restrictions by changing routes or calling APIs directly.
- Enforce the ban centrally in server-side route handlers, RPCs and database authorization for every protected operation. Client-side overlays are informational only and are not security controls.
- After expires_at, the ban automatically becomes inactive based on server time. Do not rely on a client timer to lift it.
- Active bans must be visible in the user's staff profile and in a dedicated **„Zbanowani”** list, with nickname/avatar, reason, duration, expiry, issuer and current status. Apply the same email visibility rules as the directory.

## 4. Revoking a ban (HeadAdmin and Owner only)

- Only HeadAdmin and Owner may revoke an active ban. Admin must not receive the revoke action or endpoint permission.
- Add an **„Odwołaj bana”** action beside active bans in the **„Zbanowani”** list and on the user's profile.
- Require a reason for revocation, then mark the ban revoked with actor and timestamp. Never delete the ban row.
- Revocation takes effect server-side immediately. It must not change the historical reason, original duration or issuer.
- Revoked/expired bans remain searchable in moderation history but are not shown as currently active.
- Enforce role checks in the server/database. Do not rely on hidden buttons or editable browser state.

## 5. Roles and privacy matrix

| Capability | Admin | HeadAdmin | Owner |
|---|---:|---:|---:|
| View user nickname and avatar | Yes | Yes | Yes |
| View user email | No | Yes | Yes |
| Issue warning | Yes | Yes | Yes |
| View warning acknowledgement | Yes | Yes | Yes |
| Issue temporary ban | Yes | Yes | Yes |
| View active/recent ban records | Yes | Yes | Yes |
| Revoke an active ban | No | Yes | Yes |

- Role resolution must use the authoritative user_roles system and server-validated permissions, never user-editable metadata.
- Preserve the existing multi-role hierarchy and verify each action against the actor's current roles at the time of the request.
- Staff must not issue moderation actions against themselves or against a higher-privileged staff member unless an explicit owner-approved policy is designed and tested. Default: deny self-moderation and prevent lower roles from moderating higher roles.
- Email must be excluded from Admin responses at the database/API boundary, not merely masked in the UI.

## 6. Audit, data protection and abuse prevention

- Keep append-only audit events for warning issue, warning acknowledgement, warning withdrawal/correction, ban issue, automatic expiry, ban revocation and every failed unauthorized attempt where appropriate.
- Store reasons as plain text with length limits and safe rendering; escape HTML and never render staff-entered reason as executable markup.
- Use database constraints and transactional RPCs for issue/revoke/acknowledge operations. Add idempotency protections against duplicate clicks/retries.
- Apply RLS and server authorization so users can read only their own active warning/ban notice and acknowledgement state; staff access follows the role matrix. Users cannot edit/delete moderation records.
- Avoid exposing email, internal IDs, IP addresses or private metadata in public profile cards, notifications or ordinary user pages.
- Do not let a ban block the narrow Daily Points claim exception. Add explicit tests proving every other protected mutation is denied while banned.
- Add rate limits and audit trails for warning/ban creation to reduce accidental or abusive mass moderation.

## 7. Required acceptance tests

1. Admin directory/profile API returns nickname/avatar but never email; HeadAdmin/Owner receive email only where authorized.
2. Admin, HeadAdmin and Owner can issue a warning with a required reason; ordinary users cannot.
3. An unacknowledged warning blocks protected site actions across routes and API calls.
4. Clicking „Zrozumiałem” stores the correct user, warning ID and timestamp; staff can see the acknowledgement.
5. Refreshing or opening another route does not bypass an unacknowledged warning.
6. Admin, HeadAdmin and Owner can issue a temporary ban with a required reason and valid whole-hour duration.
7. A banned user cannot use protected site functions or direct APIs, but can still claim Daily Points.
8. The ban automatically expires according to server time.
9. Only HeadAdmin and Owner can revoke a ban; Admin is denied even when calling the endpoint directly.
10. Revocation requires a reason, takes effect immediately and preserves the original ban history.
11. Active and historical bans are visible in the dedicated staff list with correct state and role-based privacy.
12. Role hierarchy, self-moderation restrictions, idempotency, RLS and Polish/English UI are tested.
13. All tests run only against Beta project owzyzfltwronhxbsrccd; never modify production project ogroffplttjcdfmrsrpe.