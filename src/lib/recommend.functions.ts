import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  diet: z.array(z.string().max(40)).max(12),
  allergies: z.string().max(300),
  notes: z.string().max(500),
  budget: z.number().min(0).max(100000).nullable(),
});
export type RecommendInput = z.infer<typeof Input>;
export type Recommendation = { productId: string; name: string; price: number; reason: string; caution: string | null };

const Out = z.object({
  summary: z.string(),
  picks: z.array(z.object({ id: z.string(), reason: z.string(), caution: z.string().nullable() })),
});

export const recommendMeals = createServerFn({ method: "POST" })
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<{ summary: string; picks: Recommendation[]; error: string | null }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { summary: "", picks: [], error: "Recommendations are not configured yet." };
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (i, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(i, { ...init, headers: h }); } },
    });
    const { data: rows, error } = await sb.from("products").select("id,name,category,description,price,promo_price,customisations").eq("section", "kitchen");
    if (error) return { summary: "", picks: [], error: "Couldn't load the menu. Please try again." };
    const menu = (rows ?? []).map((p) => ({ id: p.id, name: p.name, category: p.category, description: p.description, price: Number(p.promo_price ?? p.price), extras: p.customisations }));

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output } = await import("ai");
    const { createLovableAiGatewayRunIdFetch } = await import("./ai/run-id.server");
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1", apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        maxRetries: 0,
        output: Output.object({ schema: Out }),
        instructions: "You are the menu advisor for Mwanainchi's Kenyan restaurant 'Our Kitchen'. Recommend up to 5 meals ONLY from the provided menu (use exact ids) that suit the customer's dietary preferences, allergies and budget (KES). Never invent dishes. If an item may conflict (e.g. unknown allergens), add a short caution; otherwise caution is null. If nothing fits, return no picks and explain in the summary. Keep reasons to one friendly sentence. Remind nothing about medical advice unless allergies are mentioned.",
        messages: [{ role: "user", content: JSON.stringify({ preferences: data, menu }) }],
        providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
      });
      const out = await result.output;
      const byId = new Map(menu.map((m) => [m.id, m]));
      const picks = out.picks.filter((p) => byId.has(p.id)).map((p) => { const m = byId.get(p.id)!; return { productId: m.id, name: m.name, price: m.price, reason: p.reason, caution: p.caution }; });
      return { summary: out.summary, picks, error: null };
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      console.error("recommendMeals", status, e instanceof Error ? e.message : e);
      const msg = status === 429 ? "Our advisor is busy right now — please try again in a minute." : status === 402 || status === 403 ? "Meal recommendations are temporarily unavailable." : "We couldn't get recommendations. Please try again.";
      return { summary: "", picks: [], error: msg };
    }
  });
