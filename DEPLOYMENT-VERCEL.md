# Mwanainchi 2.0 — Vercel deployment notes

## Latest check and required actions (12 Nov 2026)
- Vercel homepage still returns HTTP 500. The supplied external backend's products lookup returns HTTP 404 / PGRST205: its shop catalogue is not available through the Data API. No database, users, orders or photos have been copied; the working Lovable connection is unchanged.
- `vite.config.ts` now explicitly selects Nitro's `vercel` preset when Vercel supplies `VERCEL=1`, covering Preview and Production while preserving Lovable's managed target.
- Replace the database password and secret API key exposed in chat before migration. Provide replacements only through a secure form; never commit them or use a `VITE_*` prefix for secrets.
- Export the current Cloud database through Lovable **More → Database → Manage → Settings → Export data**, then provide the export for inspection. A safe restore must inspect existing destination data, preserve functions/RLS/grants/sequences, handle Auth identities and owner IDs explicitly, and transfer image files plus private bucket policies separately. Do not assume application table copies transfer passwords or sign-in accounts.

### Vercel Preview and Production settings
1. Connect the repository and branch receiving these changes; enable Preview deployments for the branch under review.
2. Framework Preset: **Other**. Root Directory: project root. Node.js: **22.x**.
3. Install command: `bun install --frozen-lockfile`. Build command: `bun run build`.
4. Leave Output Directory override **disabled**. Nitro emits Vercel Build Output API files in `.vercel/output`; do not serve a static `dist` folder or add index.html rewrites.
5. Enable Vercel's system environment variables, including `VERCEL`, and redeploy after updating settings.
6. Set the five public/server configuration variables below in **both Preview and Production**, all pointing to the same backend. Use the existing Cloud public configuration to restore the current shop first, or wait until the external database transfer is verified. Vercel environment variables override repository public defaults at build time; do not edit generated clients or `.env`.
7. `SUPABASE_URL` and `VITE_SUPABASE_URL` must be the project origin only, **without `/rest/v1/`**.
8. Configure Auth Site URL and redirect allowlist for production and this project's controlled Preview origins. Keep email verification enabled. External Google sign-in needs provider configuration; the managed Lovable broker must not be assumed to work against external Auth.

### Acceptance checks still required
Open `/`, `/shop`, `/butchery`, `/kitchen`, `/auth`, `/admin` and refresh a deep link after redeploying. Then test customer checkout/cart, admin tabs and image uploads, rider assignments and password recovery against the selected backend. The Vercel build, Preview URL, runtime variables, external restore, Auth settings, photo transfer and authenticated flows remain unverified. Provide the exact Preview URL and Vercel Runtime Logs if it still fails. No Vercel account connection is available in this session.

## Earlier diagnosis (11 Nov 2026)
- Framework: TanStack Start v1 (SSR + server functions), Vite 7. Not a plain SPA — do NOT add SPA rewrites to vercel.json.
- https://mwanainchi-butchery-restaurant.vercel.app/ returns HTTP 500 on every route (`/`, `/shop`). The HTML shell renders, then the root
  loader's catalog server function fails, so the root error page ("This page didn't load") is shown and the page never hydrates —
  which is why links do nothing.
- Most likely cause: the server-side variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are not set in Vercel. Confirm in
  Vercel → Deployments → latest → Runtime Logs (not visible from Lovable).
- Code fix: catalog now falls back to the build-time `VITE_*` public values and fails with a clear message.
- The build config targets Cloudflare by default; Vercel needs its Nitro preset (set `NITRO_PRESET=vercel` in Vercel env if logs show
  missing handler / function errors).

## Vercel environment variables (Production + Preview)
Public (safe): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
Server: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`; `LOVABLE_API_KEY` separately for the meal advisor AI (availability on Vercel unverified).
No active shop operation imports the privileged admin client: admin writes use the authenticated user's token and RLS. Do not add the exposed secret key to fix public catalogue or admin sign-in. The database connection string is for migration, not normal shop runtime.
Redeploy after changing any variable.

## Supabase / auth
Code points at the Lovable Cloud backend (project in `.env`). If you intend a separately created Supabase project, its schema,
data and migrations (supabase/migrations) must be applied there first — that was not done. Add the Vercel URL to the auth
Site URL / redirect list for password reset and email confirmation.

## Workflow
Lovable → GitHub (synced branch, usually `main`) → Vercel production branch must be the same branch. Database migrations are
never applied by Git sync. Roll back via Vercel → Deployments → Promote previous.
