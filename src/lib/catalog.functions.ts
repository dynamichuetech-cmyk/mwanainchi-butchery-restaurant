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
  return { products: p.data ?? [], zones: z.data ?? [], settings: s.data };
});
