# Unified customer/rider authentication and private administrator portal

## Existing issues and changes
The former public sign-in form exposed an administrator link and mode, and the storefront header/customer account linked to administration. There was no rider profile, approval workflow or assignment boundary.

The shared `/auth` now offers only Customer and Delivery Rider choices, registration, login, recovery and verification feedback. Existing customer sessions and checkout return destinations remain supported. Rider applications create a trusted rider role and a separate pending approval record. Browser metadata is only a request for a nonprivileged application, never authoritative permission or approval. Existing customers can apply using the same identity; this explicitly moves their account into rider-only access, removing ordinary checkout capability.

`/admin` is a separate, restrained sign-in page without public registration or storefront navigation. `/admin/dashboard` retains the existing order/product dashboard and adds rider reviews and approved-rider assignment. `/admin/riders` is a private review page. All private administration links were removed from public header, account and authentication pages. The private portal omits the storefront shell.

The provider includes trusted rider status; role and account-active checks run server-side. Refresh events re-resolve identity. The existing managed authenticated layout is retained. This project uses TanStack server functions, not Express; no parallel backend was introduced.

## Routes
Created: `/admin` (private sign-in), `/admin/dashboard` (moved existing dashboard), `/admin/riders`, `/rider`, `/rider/status`, `/rider/profile`.
Modified: `/auth`, `/account`, `/checkout`, shared header and root layout.
Public login/register subpaths are implemented as shared views. Existing kitchen remains `/kitchen`, not renamed. Customer account sections remain tabs. Extended inventory/reports/payments/settings/customer-management pages were not fabricated; they remain future operations work. Rider deliveries and delivered history are in the rider assignment list rather than duplicate URLs.

## Database and RLS
Migration 0006 adds `rider_profiles`, `account_access` and `delivery_assignments`; retains existing profiles and enum-backed user_roles. All new tables have explicit grants and RLS. Riders read only their own status. Approved riders read only their own assignments. Admin review reads require active trusted admin permission. No direct approval, assignment or role writes are granted to ordinary authenticated clients.

Trusted functions implement rider applications, admin review, approved-rider delivery updates, valid status transitions and restricted active-assignment location changes. Approval requires email confirmation. Existing customer order creation remains through place_order with verified customer-only identity, repricing and stock checks.

Migration 0007 binds the existing owner grant to the already-provisioned auth UUID, rather than future browser-supplied email values. It adds administrator assignment of ready delivery orders to approved verified riders and a narrowly projected caller-only delivery-detail function. Active admin access is independently enforced by has_role and RLS. Account access records can only be modified by trusted administrative database operations.

## Provisioning
The existing designated owner account must confirm its email before the owner trigger grants admin. Then visit `/admin` directly and sign in; no password was generated or exposed. New privileged administrators must be provisioned through owner-controlled Lovable Cloud administrative operations: create/verify the identity, then assign a protected user_roles record using trusted database operations, never the public application. To disable an admin, a trusted operator sets account_access.active=false for that identity; active-admin checks then deny access. No public admin signup or browser role editor was added. A complete super-admin invitation/role-management UI remains unimplemented.

## Verification actually performed
- New customer registration and new rider application completed against live auth: pending verification feedback, and unconfirmed password login rejected.
- Live database query confirmed rider role and pending_approval profile for the new rider applicant.
- Real customer session restored account and checkout after refresh; cart retained and checkout destination restored.
- Customer visiting `/admin` or `/admin/dashboard` was denied. Customer visiting rider pages was denied and offered an explicit application, not implicitly converted.
- Signed-out `/admin/dashboard` returned to private `/admin`; signed-out rider routes returned to rider-mode `/auth`.
- Public header/footer admin link count was zero. Public auth had no admin option. Private admin had no creation option.
- Desktop and 390px mobile public/rider registration inspected: no horizontal overflow or uncaught browser errors in public checks.
- Customer DB reads of other profiles/orders/roles returned no rows; self-promotion, email identity changes, invalid tokens and unsigned order calls were rejected. Customer product edits affected zero rows.
- Customer and minted unverified rider callers could not approve applications or assign deliveries. Rider could read own pending profile but no assignments.
- Minted unverified rider session returned verification guidance for protected rider pages, not delivery access. This is not equivalent to verified pending-rider login.
- Automated auth/role/destination/registration tests plus existing routing/pricing: 30 passed.
- Latest automatic compilation passed.

## Unverified and remaining
Email-link completion, real confirmed customer/rider password login, approved rider session/navigation, administrator password login and rider approval happy path have not been verified. The owner remains awaiting confirmation; the newly registered rider also awaits mailbox confirmation. No account was silently auto-confirmed or promoted to make tests pass. Therefore the full acceptance matrix is NOT complete.

Natural session-expiration/refresh exchange and electronic payments remain untested/configuration-dependent. Rider-to-rider isolation has a caller-scoped RLS policy but was not tested with two verified rider accounts. Live assignment status/location happy paths were not exercised; no assignments were fabricated. Existing customer cash-order creation was proven in the preceding repair; this change retested customer checkout restoration, not another submitted order.

Detailed permission matrices for inventory/kitchen/cashier/delivery-manager roles and full super-admin access management are not added. Account-active checks protect administrator operations; unrelated customer own-record policies were preserved. Live map tracking is not implemented. M-Pesa/card provider configuration remains unchanged and pending.

Source changes: shared auth rules/functions/provider, public auth, private admin routes, rider routes, RiderReview, Header, root shell, account/checkout guards, tests, AGENTS, roadmap and generated migration/types files. The storefront, catalogue, kitchen, cart and existing business dashboard are preserved.
