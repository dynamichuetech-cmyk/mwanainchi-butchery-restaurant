# Mwanainchi authentication repair report

## Diagnosed causes
- Authentication was not shared across the header, login, account and checkout. Successful login navigated before profile and role resolution, and initial restoration was not reflected in the header.
- Existing customers had profiles but no customer role. The original signup trigger did not save phone numbers or assign customer roles.
- Login defaulted to the account page regardless of administrator permissions. Google return and verification destinations could reach protected pages before session hydration.
- Logout left protected query caches intact.
- The designated administrator account has not confirmed its email and therefore correctly has no administrator role. This is a remaining account-verification requirement, not a permission policy to bypass.
- End-to-end checkout exposed a separate existing database defect: collection orders referenced an unassigned delivery-zone record. This was reproduced, repaired and retested.
- Email sign-in was already enabled; credentials, profile existence and the existing own-record read policies were not the root problem. Logs also showed repeated confirmation requests hitting the email resend cooldown.

## Implemented flow
- One central provider restores the supported auth session, resolves verified identity through an authenticated server function, and exposes user, session, profile, role, loading/authenticated/admin/customer/rider flags and login/register/logout/refresh methods.
- One nonblocking event listener handles initial session, login, logout, token refresh, profile changes and recovery. Same-token in-flight resolution is deduplicated and stale responses cannot restore a signed-out identity.
- The existing integration-managed protected layout is retained. Administrator and checkout guards independently resolve roles server-side. Database policies remain the business-operation security boundary.
- Registration validates name, email, Kenyan phone, an eight-character password and matching confirmation. A trusted signup trigger creates the profile and default customer role. Pending verification is not treated as login.
- Administrator login is a separate mode at `/auth?admin=true&redirect=%2Fadmin`. Actual database roles govern access; valid customer sessions are preserved when administration is denied.
- Only internal non-looping redirects are allowed. Checkout destinations and carts survive authentication; Google returns to a public auth page.
- Checkout calls an authenticated TanStack server function, which invokes the existing `place_order` function. That function verifies identity, restricts purchasing to customer-only roles, reprices items, checks stock and fees, and owns order totals and payment state. This project has no Express service; none was introduced.
- Logout cancels requests, clears protected caches, signs out and replaces the current location with the sign-in page.
- Recovery checks the recovery-link state, requires password confirmation and uses the supported recovery password update without a current password.

## Files changed
- `src/lib/auth.tsx`, `src/lib/auth.functions.ts`, `src/lib/auth-rules.ts`, `src/lib/auth-rules.test.ts`
- `src/routes/auth.tsx`, `src/routes/reset-password.tsx`, `src/routes/__root.tsx`
- `src/routes/_authenticated/account.tsx`, `admin.tsx`, `checkout.tsx`, `orders.$orderId.tsx`
- `src/components/site/Header.tsx`
- `AGENTS.md`, `roadmap.md`, this report
- Generated database types and migration journal/snapshots, through the database migration tool only

## Database changes
- `0003_repair_auth_identity_lifecycle.sql`: adds profile email/avatar/update timestamp and role assignment metadata; extends the existing role enum; updates the trusted signup trigger; adds verified, caller-only identity repair; scopes role lookup to the caller; protects profile identity fields.
- `0004_repair_checkout_collection_record_and_identity.sql`: fixes the collection-zone record; adds verified customer-role checks inside `place_order`; removes anonymous execution.
- `0005_scope_profile_fields_and_superadmin_access.sql`: limits customer profile writes to approved columns; makes the existing admin RLS policies recognise super administrators.
- Existing enum-backed `user_roles` and its unique assignment constraint are retained rather than creating duplicate roles tables.
- The own-profile UPDATE policy now has an explicit owner WITH CHECK. Existing own-order/payment/address and administrator policies remain enabled. Customers cannot write role assignments. No sensitive-table unrestricted read policies or service keys were introduced.

## Genuinely tested
### Browser, live backend and real customer session
- Initial session restoration, account recognition and persistence after refresh: passed.
- Invalid email/password: clear error, passed.
- New registration: pending-verification state, passed. Database profile, phone and trusted customer-role creation confirmed.
- Unconfirmed account login: rejected with verification guidance, passed.
- Password mismatch: rejected, passed.
- Signed-out checkout: redirects to sign-in preserving `/checkout`, passed.
- Cart retained through restoring a signed-in session from the sign-in page; automatic return to checkout and checkout refresh: passed.
- Logged-in checkout: actual 1 kg steak cash-collection order MW10003, KES 950, created and displayed through tracking and account history; passed. This is a real test order in the project, not a simulated payment.
- Customer attempt to visit administrator dashboard: denied with clear message; customer session preserved, passed.
- Logout and subsequent protected checkout access: rejected, passed.
- Desktop and 390px mobile sign-in: inspected; no horizontal overflow. Browser scripts reported no uncaught errors in the session and registration checks.

### Database security through customer and anonymous requests
- Other customer's profile/order/role reads returned no rows.
- Self-assignment of admin: HTTP 403.
- Editing profile email: HTTP 403; approved own-profile name update: HTTP 204.
- Customer product modification: zero rows affected.
- Anonymous order execution and malformed/invalid token access: HTTP 401.
- Applied checkout identity and collection repair checked in the live database.

### Automated checks
- 19 authentication tests cover role precedence, customer/admin/rider separation, safe redirects and registration requirements.
- Existing routing and pricing tests also pass: 23 tests total.
- Latest automatic preview compilation/type checking: passed.

## Not yet verified / remaining requirements
- A real administrator password login, email-confirmation click, dashboard functions, administrator refresh and logout cannot be claimed tested: the designated administrator email remains unconfirmed and has no admin grant. Confirm that account using its email link, then sign in from Administrator sign in. No password was created or exposed.
- A real existing-customer password login after confirmation and Google OAuth completion were not performed; customer restoration was tested with an authorised managed session, not a password.
- Email delivery and clicking confirmation/recovery links in the recipient's mailbox are unverified. Registration correctly requires confirmation; automatic confirmation remains disabled.
- Explicit token-refresh handling is implemented but an actual naturally expired access token/refresh exchange was not exercised. Invalid-token rejection was tested.
- Rider delivery assignments and rider business pages do not exist in the current project. No rider account/assignment security flow was tested or fabricated. Staff roles are representable but new staff portals and permission matrices were not added.
- M-Pesa STK and card processing still need their existing provider configuration; no electronic test payment was attempted or marked paid.
- Full delivery-address checkout was not rerun; the complete newly repaired order submission was verified with collection.
- The exhaustive requested multi-role acceptance matrix is therefore not complete. Do not treat this report as verification of the outstanding scenarios.

The existing storefront, catalogue, kitchen, cart and admin dashboard design were preserved.