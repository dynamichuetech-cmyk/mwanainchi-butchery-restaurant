# Mwanainchi 2.0 — Vercel deployment notes

## Diagnosis (verified 11 Nov 2026)
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
Server: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (admin functions), `LOVABLE_API_KEY` (meal advisor AI)
Redeploy after changing any variable.

## Supabase / auth
Code points at the Lovable Cloud backend (project in `.env`). If you intend a separately created Supabase project, its schema,
data and migrations (supabase/migrations) must be applied there first — that was not done. Add the Vercel URL to the auth
Site URL / redirect list for password reset and email confirmation.

## Workflow
Lovable → GitHub (synced branch, usually `main`) → Vercel production branch must be the same branch. Database migrations are
never applied by Git sync. Roll back via Vercel → Deployments → Promote previous.
