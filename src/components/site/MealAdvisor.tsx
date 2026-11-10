import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { recommendMeals, type Recommendation } from "@/lib/recommend.functions";
import { formatKES } from "@/lib/pricing";
import type { Product } from "@/lib/catalog";
import { AddToCartDialog } from "./AddToCart";
import { cn } from "@/lib/utils";

const DIETS = ["Halal", "No pork", "Low carb", "High protein", "Vegetarian", "Pescatarian", "Gluten-free", "Dairy-free", "Mild / not spicy", "Kid-friendly"];

export function MealAdvisor({ products }: { products: Product[] }) {
  const run = useServerFn(recommendMeals);
  const [diet, setDiet] = useState<string[]>([]);
  const [allergies, setAllergies] = useState("");
  const [notes, setNotes] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ summary: string; picks: Recommendation[]; error: string | null } | null>(null);
  const [open, setOpen] = useState<Product | null>(null);

  const toggle = (d: string) => setDiet((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]));
  const submit = async () => {
    if (!diet.length && !allergies.trim() && !notes.trim()) { setRes({ summary: "", picks: [], error: "Tell us at least one preference first." }); return; }
    setBusy(true); setRes(null);
    try { setRes(await run({ data: { diet, allergies: allergies.trim(), notes: notes.trim(), budget: budget ? Number(budget) : null } })); }
    catch { setRes({ summary: "", picks: [], error: "We couldn't get recommendations. Please try again." }); }
    finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="advisor" className="mt-8 rounded-3xl bg-card p-5 shadow-warm sm:p-8">
      <h2 id="advisor" className="flex items-center gap-2 text-2xl font-bold"><Sparkles className="h-5 w-5 text-primary" /> Find meals that suit you</h2>
      <p className="mt-1 text-sm text-muted-foreground">Share your dietary needs and we'll suggest dishes from today's menu.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {DIETS.map((d) => (
          <button key={d} type="button" aria-pressed={diet.includes(d)} onClick={() => toggle(d)}
            className={cn("rounded-full border px-3 py-1.5 text-sm", diet.includes(d) ? "border-primary bg-primary text-primary-foreground" : "hover:border-charcoal")}>{d}</button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input placeholder="Allergies (e.g. peanuts, shellfish)" value={allergies} maxLength={300} onChange={(e) => setAllergies(e.target.value)} />
        <Input type="number" inputMode="numeric" min={0} placeholder="Budget per person (KES, optional)" value={budget} onChange={(e) => setBudget(e.target.value)} />
      </div>
      <Textarea className="mt-3" placeholder="Anything else? e.g. 'feeding 4, love grilled food'" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
      <Button className="mt-4 rounded-full px-6 font-bold" disabled={busy} onClick={submit}>
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Finding meals…</> : "Recommend meals"}
      </Button>

      {res?.error && <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4" /> {res.error}</p>}
      {res && !res.error && (
        <div className="mt-6 space-y-3">
          {res.summary && <p className="text-sm">{res.summary}</p>}
          <ul className="grid gap-3 sm:grid-cols-2">
            {res.picks.map((p) => {
              const prod = products.find((x) => x.id === p.productId);
              return (
                <li key={p.productId} className="flex flex-col gap-2 rounded-2xl border p-4">
                  <div className="flex justify-between gap-2 font-semibold"><span>{p.name}</span><span>{formatKES(p.price)}</span></div>
                  <p className="text-sm text-muted-foreground">{p.reason}</p>
                  {p.caution && <p className="text-xs text-destructive">⚠ {p.caution}</p>}
                  {prod && <Button size="sm" variant="outline" className="mt-auto w-fit rounded-full" onClick={() => setOpen(prod)}>Add to cart</Button>}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">Suggestions are AI-generated. Please confirm allergens with our kitchen if you have a serious allergy.</p>
        </div>
      )}
      <AddToCartDialog product={open} onClose={() => setOpen(null)} />
    </section>
  );
}
