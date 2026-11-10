import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BUTCHERY_CATEGORIES, KITCHEN_CATEGORIES } from "@/lib/catalog";
import { images } from "@/lib/images";

import type { Database } from "@/integrations/supabase/types";

type ProductPatch = Database["public"]["Tables"]["products"]["Update"];
type ZonePatch = Database["public"]["Tables"]["delivery_zones"]["Update"];
const sel = "h-9 rounded-md border bg-background px-2 text-sm";
const num = (v: string) => (v === "" ? null : Number(v));

function useProducts() {
  return useQuery({ queryKey: ["admin-products"], queryFn: async () => { const r = await supabase.from("products").select("*").order("sort"); if (r.error) throw r.error; return r.data; } });
}
function useRefresh() {
  const qc = useQueryClient();
  return () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); qc.invalidateQueries({ queryKey: ["admin-zones"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); };
}

export function ProductsAdmin() {
  const { data = [] } = useProducts();
  const refresh = useRefresh();
  const [filter, setFilter] = useState<"all" | "butchery" | "kitchen">("all");
  const save = async (id: string, patch: ProductPatch) => {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); refresh();
  };
  const shown = data.filter((p) => filter === "all" || p.section === filter);
  return (
    <div className="mt-6 space-y-4">
      <NewProduct onDone={refresh} />
      <div className="flex gap-2">{(["all", "butchery", "kitchen"] as const).map((f) => <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="rounded-full capitalize" onClick={() => setFilter(f)}>{f}</Button>)}</div>
      <ul className="divide-y rounded-2xl bg-card shadow-warm">
        {shown.map((p) => (
          <li key={p.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_110px_110px_auto_auto]">
            <div className="min-w-0 space-y-1">
              <Input aria-label="Name" defaultValue={p.name} onBlur={(e) => e.target.value.trim() && e.target.value !== p.name && save(p.id, { name: e.target.value.trim() })} />
              <Input aria-label="Description" className="text-xs" defaultValue={p.description} onBlur={(e) => e.target.value !== p.description && save(p.id, { description: e.target.value })} />
              <p className="text-xs text-muted-foreground">{p.section} · {p.category} · per {p.unit}</p>
            </div>
            <label className="text-xs">Price<Input type="number" min={0} defaultValue={Number(p.price)} onBlur={(e) => { const v = Number(e.target.value); if (v > 0 && v !== Number(p.price)) save(p.id, { price: v }); }} /></label>
            <label className="text-xs">Offer price<Input type="number" min={0} defaultValue={p.promo_price ?? ""} onBlur={(e) => { const v = num(e.target.value); if (v !== (p.promo_price == null ? null : Number(p.promo_price))) save(p.id, { promo_price: v }); }} /></label>
            <label className="flex items-center gap-2 text-xs"><Switch checked={p.available} onCheckedChange={(v) => save(p.id, { available: v })} /> Available</label>
            <label className="flex items-center gap-2 text-xs"><Switch checked={p.featured} onCheckedChange={(v) => save(p.id, { featured: v })} /> Featured</label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewProduct({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", section: "kitchen", category: KITCHEN_CATEGORIES[0]!, price: "", unit: "piece", stock: "0", image_key: "platter", description: "" });
  const cats = f.section === "kitchen" ? KITCHEN_CATEGORIES : BUTCHERY_CATEGORIES;
  if (!open) return <Button className="rounded-full" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add product</Button>;
  const create = async () => {
    const price = Number(f.price);
    if (!f.name.trim() || !(price > 0)) { toast.error("Enter a name and a price above 0"); return; }
    const kg = f.unit === "kg";
    const slug = `${f.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
    const { error } = await supabase.from("products").insert({ name: f.name.trim(), slug, section: f.section, category: f.category, price, unit: f.unit, sell_type: kg ? "weight" : "unit", min_qty: kg ? 0.5 : 1, step: kg ? 0.25 : 1, stock: Number(f.stock) || 0, image_key: f.image_key, description: f.description.trim() });
    if (error) { toast.error(error.message); return; }
    toast.success("Product added"); setOpen(false); setF({ ...f, name: "", price: "", description: "" }); onDone();
  };
  return (
    <div className="grid gap-3 rounded-2xl bg-card p-4 shadow-warm sm:grid-cols-4">
      <Input placeholder="Product name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <select aria-label="Section" className={sel} value={f.section} onChange={(e) => { const s = e.target.value; setF({ ...f, section: s, category: (s === "kitchen" ? KITCHEN_CATEGORIES : BUTCHERY_CATEGORIES)[0]!, unit: s === "kitchen" ? "piece" : "kg" }); }}><option value="kitchen">Our Kitchen</option><option value="butchery">Butchery</option></select>
      <select aria-label="Category" className={sel} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
      <select aria-label="Unit" className={sel} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}><option value="piece">per piece</option><option value="kg">per kg</option><option value="plate">per plate</option></select>
      <Input type="number" placeholder="Price (KES)" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
      <Input type="number" placeholder="Opening stock" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} />
      <select aria-label="Photo" className={sel} value={f.image_key} onChange={(e) => setF({ ...f, image_key: e.target.value })}>{Object.keys(images).filter((k) => k !== "hero").map((k) => <option key={k}>{k}</option>)}</select>
      <Input placeholder="Short description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <div className="flex gap-2 sm:col-span-4"><Button className="rounded-full" onClick={create}>Save product</Button><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
    </div>
  );
}

export function InventoryAdmin() {
  const { data = [] } = useProducts();
  const refresh = useRefresh();
  const low = (p: (typeof data)[number]) => Number(p.stock) <= (p.unit === "kg" ? 5 : 5);
  const setStock = async (id: string, stock: number) => {
    if (stock < 0) { toast.error("Stock can't be negative"); return; }
    const { error } = await supabase.from("products").update({ stock }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Stock updated"); refresh();
  };
  const sorted = [...data].sort((a, b) => Number(a.stock) - Number(b.stock));
  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm text-muted-foreground">{data.filter(low).length} items running low (5 or fewer left). Lowest stock first.</p>
      <ul className="divide-y rounded-2xl bg-card shadow-warm">
        {sorted.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1"><p className="flex items-center gap-2 font-semibold">{low(p) && <AlertTriangle className="h-4 w-4 text-destructive" aria-label="Low stock" />}{p.name}</p><p className="text-xs text-muted-foreground">{p.section} · {p.category}</p></div>
            <span className="w-24 text-sm font-bold">{Number(p.stock)} {p.unit}</span>
            <StockEditor unit={p.unit} onSet={(n) => setStock(p.id, n)} current={Number(p.stock)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
function StockEditor({ current, unit, onSet }: { current: number; unit: string; onSet: (n: number) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-2">
      <Input aria-label="Quantity" type="number" step="0.25" className="h-9 w-24" placeholder={unit} value={v} onChange={(e) => setV(e.target.value)} />
      <Button size="sm" variant="outline" onClick={() => { if (v) { onSet(current + Number(v)); setV(""); } }}>Add</Button>
      <Button size="sm" variant="ghost" onClick={() => { if (v) { onSet(Number(v)); setV(""); } }}>Set</Button>
    </div>
  );
}

export function ZonesAdmin() {
  const refresh = useRefresh();
  const { data = [] } = useQuery({ queryKey: ["admin-zones"], queryFn: async () => { const r = await supabase.from("delivery_zones").select("*").order("sort"); if (r.error) throw r.error; return r.data; } });
  const [name, setName] = useState("");
  const save = async (id: string, patch: ZonePatch) => {
    const { error } = await supabase.from("delivery_zones").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); refresh();
  };
  const add = async () => {
    if (!name.trim()) { toast.error("Enter an area name"); return; }
    const { error } = await supabase.from("delivery_zones").insert({ name: name.trim(), fee: 200, min_order: 500, sort: data.length + 1 });
    if (error) { toast.error(error.message); return; }
    setName(""); toast.success("Area added — set its fee below"); refresh();
  };
  const remove = async (id: string) => {
    if (!confirm("Remove this delivery area? Past orders keep their record; you can switch it off instead.")) return;
    const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
    if (error) { toast.error("This area is used by past orders or addresses — switch it off instead."); return; }
    refresh();
  };
  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2"><Input placeholder="New delivery area, e.g. Ruai" value={name} onChange={(e) => setName(e.target.value)} /><Button className="rounded-full" onClick={add}><Plus className="h-4 w-4" /> Add area</Button></div>
      <ul className="divide-y rounded-2xl bg-card shadow-warm">
        {data.map((z) => (
          <li key={z.id} className="grid grid-cols-2 items-end gap-3 p-4 sm:grid-cols-[1fr_100px_100px_110px_110px_auto_auto]">
            <label className="col-span-2 text-xs sm:col-span-1">Area<Input defaultValue={z.name} onBlur={(e) => e.target.value.trim() && e.target.value !== z.name && save(z.id, { name: e.target.value.trim() })} /></label>
            <label className="text-xs">Fee<Input type="number" min={0} defaultValue={Number(z.fee)} onBlur={(e) => Number(e.target.value) !== Number(z.fee) && save(z.id, { fee: Number(e.target.value) })} /></label>
            <label className="text-xs">Min. order<Input type="number" min={0} defaultValue={Number(z.min_order)} onBlur={(e) => Number(e.target.value) !== Number(z.min_order) && save(z.id, { min_order: Number(e.target.value) })} /></label>
            <label className="text-xs">Free over<Input type="number" min={0} defaultValue={z.free_threshold ?? ""} onBlur={(e) => { const v = num(e.target.value); if (v !== (z.free_threshold == null ? null : Number(z.free_threshold))) save(z.id, { free_threshold: v }); }} /></label>
            <label className="text-xs">Delivery time<Input defaultValue={z.eta} onBlur={(e) => e.target.value !== z.eta && save(z.id, { eta: e.target.value })} /></label>
            <label className="flex items-center gap-2 pb-2 text-xs"><Switch checked={z.active} onCheckedChange={(v) => save(z.id, { active: v })} /> Active</label>
            <Button size="icon" variant="ghost" aria-label={`Remove ${z.name}`} onClick={() => remove(z.id)}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Changes appear in checkout straight away. Switch an area off to stop new deliveries there.</p>
    </div>
  );
}
