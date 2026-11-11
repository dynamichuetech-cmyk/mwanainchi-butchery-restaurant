import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  // Fall back to the public VITE_* values so hosts that only set those (e.g. Vercel) still work.
  const url = process.env["SUPABASE_URL"] || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Catalog unavailable: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY are not set on the server.");
  const sb = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const [p, z, s] = await Promise.all([
    sb.from("products").select("*").order("sort"),
    sb.from("delivery_zones").select("*").eq("active", true).order("sort"),
    sb.from("store_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (p.error) throw new Error(p.error.message);
  const products = p.data ?? [];
  const paths = products.filter((x) => x.image_key.startsWith("upload:")).map((x) => x.image_key.slice(7));
  if (paths.length) {
    const { data: signed } = await sb.storage.from("product-images").createSignedUrls(paths, 60 * 60 * 24 * 7);
    const map = new Map((signed ?? []).map((x) => [x.path, x.signedUrl]));
    for (const x of products) if (x.image_key.startsWith("upload:")) x.image_key = map.get(x.image_key.slice(7)) ?? "beef";
  }
  return { products, zones: z.data ?? [], settings: s.data };
});
