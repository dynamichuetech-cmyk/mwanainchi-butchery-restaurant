<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Orders are created only through the `place_order` database function, which re-prices items, checks stock/zone/discount and deducts stock — never insert orders from the client. Why: prices and availability must be validated server-side.
- Product images are referenced by `image_key` mapped in `src/lib/images.ts`. Why: bundled assets, no storage needed yet.
- Public catalogue (products, zones, settings) loads via the `getCatalog` server function with the publishable key. Why: SSR-safe public reads.
- Admin access comes only from the user_roles table (has_role); the provisioned owner auth ID is auto-granted admin by a trigger once its email is confirmed. Why: no hardcoded credentials, no client-side role checks.
- Shared authentication state is owned by AuthProvider with one nonblocking Auth subscription; protected route gates remain integration-managed and role checks use authenticated server functions. Why: avoid session races and competing listeners.
- Retain the existing enum-backed user_roles model; resolve the highest assigned role on the server and repair only missing customer identities. Why: preserve existing RLS without introducing parallel permission tables.
- Checkout submits through an authenticated TanStack server function to place_order, never a parallel Express service. Why: the existing server runtime and database function own verified identity and pricing.
- Private admin entry is a public sign-in surface with no registration; dashboard routes are unnested under the managed authenticated layout and revalidate active administrator access server-side. Why: direct URLs remain secure without exposing private entry in storefront menus.
- Rider signup metadata is only an application request: the trusted signup trigger assigns a nonprivileged rider role and pending profile; approval and delivery transitions are locked database functions. Why: browser metadata cannot establish approval or privileged access.
- Uploaded product photos live in the private `product-images` bucket; products store `upload:<path>` in image_key and getCatalog swaps it for a signed URL. Why: workspace blocks public buckets.
