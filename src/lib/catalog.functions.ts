import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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
