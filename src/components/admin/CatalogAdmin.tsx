import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Plus, Trash2, Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BUTCHERY_CATEGORIES, KITCHEN_CATEGORIES } from "@/lib/catalog";
import { images, img, UPLOAD_PREFIX } from "@/lib/images";

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
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const thumbs = useThumbs(data.map((p) => p.image_key));
  const save = async (id: string, patch: ProductPatch, quiet = false) => {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    if (!quiet) toast.success("Saved");
    refresh(); return true;
  };
  const shown = data.filter((p) => (filter === "all" || p.section === filter) && p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mt-6 space-y-4">
      <NewProduct onDone={refresh} />
      <div className="flex flex-wrap gap-2">
        {(["all", "butchery", "kitchen"] as const).map((f) => <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="rounded-full capitalize" onClick={() => setFilter(f)}>{f}</Button>)}
        <Input className="h-9 max-w-xs" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ul className="divide-y rounded-2xl bg-card shadow-warm">
        {shown.map((p) => (
          <li key={p.id} className="p-4">
            <div className="grid gap-3 sm:grid-cols-[72px_1fr_110px_110px_auto]">
              <PhotoPicker src={thumbs[p.image_key] ?? img(p.image_key)} name={p.name} onUploaded={(key) => save(p.id, { image_key: key })} />
              <div className="min-w-0 space-y-1">
                <Input aria-label="Name" defaultValue={p.name} onBlur={(e) => e.target.value.trim() && e.target.value !== p.name && save(p.id, { name: e.target.value.trim() })} />
                <p className="text-xs text-muted-foreground">{p.section} · {p.category} · per {p.unit} · stock {Number(p.stock)}</p>
              </div>
              <label className="text-xs">Price<Input type="number" min={0} defaultValue={Number(p.price)} onBlur={(e) => { const v = Number(e.target.value); if (v > 0 && v !== Number(p.price)) save(p.id, { price: v }); }} /></label>
              <label className="text-xs">Offer price<Input type="number" min={0} defaultValue={p.promo_price ?? ""} onBlur={(e) => { const v = num(e.target.value); if (v !== (p.promo_price == null ? null : Number(p.promo_price))) save(p.id, { promo_price: v }); }} /></label>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-1"><Switch checked={p.available} onCheckedChange={(v) => save(p.id, { available: v })} /> On sale</label>
                <label className="flex items-center gap-1"><Switch checked={p.featured} onCheckedChange={(v) => save(p.id, { featured: v })} /> Featured</label>
                <label className="flex items-center gap-1"><Switch checked={p.bestseller} onCheckedChange={(v) => save(p.id, { bestseller: v })} /> Bestseller</label>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditing(editing === p.id ? null : p.id)}>{editing === p.id ? "Close" : "Edit details"}</Button>
              </div>
            </div>
            {editing === p.id && <ProductDetails p={p} onSave={async (patch) => { if (await save(p.id, patch)) setEditing(null); }} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Row = Database["public"]["Tables"]["products"]["Row"];
function ProductDetails({ p, onSave }: { p: Row; onSave: (patch: ProductPatch) => void }) {
  const addons = Array.isArray(p.customisations) ? (p.customisations as { name: string; price: number }[]) : [];
  const [f, setF] = useState({
    description: p.description, section: p.section, category: p.category, unit: p.unit, sell_type: p.sell_type,
    min_qty: String(p.min_qty), step: String(p.step), prep: p.prep_options.join(", "),
    addons: addons.map((a) => `${a.name}: ${a.price}`).join("\n"), serving_info: p.serving_info ?? "", prep_minutes: p.prep_minutes == null ? "" : String(p.prep_minutes), sort: String(p.sort),
  });
  const cats = f.section === "kitchen" ? KITCHEN_CATEGORIES : BUTCHERY_CATEGORIES;
  const submit = () => {
    const parsed: { name: string; price: number }[] = [];
    for (const line of f.addons.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const m = line.match(/^(.+?)\s*[:\-]\s*(\d+(?:\.\d+)?)$/);
      if (!m) { toast.error(`Extras must look like "Extra chips: 150" — check "${line}"`); return; }
      parsed.push({ name: m[1]!.trim(), price: Number(m[2]) });
    }
    const min = Number(f.min_qty), step = Number(f.step);
    if (!(min > 0) || !(step > 0)) { toast.error("Minimum quantity and step must be above 0"); return; }
    onSave({ description: f.description.trim(), section: f.section, category: f.category, unit: f.unit, sell_type: f.sell_type, min_qty: min, step,
      prep_options: f.prep.split(",").map((s) => s.trim()).filter(Boolean), customisations: parsed,
      serving_info: f.serving_info.trim() || null, prep_minutes: f.prep_minutes === "" ? null : Number(f.prep_minutes), sort: Number(f.sort) || 0 });
  };
  return (
    <div className="mt-4 grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-3">
      <label className="text-xs sm:col-span-3">Description<Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
      <label className="text-xs">Section<select className={`${sel} w-full`} value={f.section} onChange={(e) => { const s = e.target.value; setF({ ...f, section: s, category: (s === "kitchen" ? KITCHEN_CATEGORIES : BUTCHERY_CATEGORIES)[0]! }); }}><option value="kitchen">Our Kitchen</option><option value="butchery">Butchery</option></select></label>
      <label className="text-xs">Category<select className={`${sel} w-full`} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label className="text-xs">Sold<select className={`${sel} w-full`} value={f.sell_type} onChange={(e) => setF({ ...f, sell_type: e.target.value, unit: e.target.value === "weight" ? "kg" : f.unit === "kg" ? "piece" : f.unit })}><option value="unit">By the piece / plate</option><option value="weight">By weight (kg)</option></select></label>
      <label className="text-xs">Unit name<Input value={f.unit} disabled={f.sell_type === "weight"} onChange={(e) => setF({ ...f, unit: e.target.value })} /></label>
      <label className="text-xs">Minimum quantity<Input type="number" step="0.25" value={f.min_qty} onChange={(e) => setF({ ...f, min_qty: e.target.value })} /></label>
      <label className="text-xs">Quantity step<Input type="number" step="0.25" value={f.step} onChange={(e) => setF({ ...f, step: e.target.value })} /></label>
      <label className="text-xs sm:col-span-3">Preparation choices (comma separated, e.g. Whole, Cubed, Minced)<Input value={f.prep} onChange={(e) => setF({ ...f, prep: e.target.value })} /></label>
      <label className="text-xs sm:col-span-2">Paid extras — one per line as "Name: price"<Textarea rows={4} placeholder={"Extra chips: 150\nKachumbari: 50"} value={f.addons} onChange={(e) => setF({ ...f, addons: e.target.value })} /></label>
      <div className="space-y-3">
        <label className="block text-xs">Serving info<Input placeholder="Serves 2" value={f.serving_info} onChange={(e) => setF({ ...f, serving_info: e.target.value })} /></label>
        <label className="block text-xs">Prep time (minutes)<Input type="number" value={f.prep_minutes} onChange={(e) => setF({ ...f, prep_minutes: e.target.value })} /></label>
        <label className="block text-xs">Display order<Input type="number" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })} /></label>
      </div>
      <Button className="w-fit rounded-full sm:col-span-3" onClick={submit}>Save details</Button>
    </div>
  );
}

/** Admin-side previews for uploaded photos (bucket is private; signed links). */
function useThumbs(keys: string[]) {
  const paths = [...new Set(keys.filter((k) => k.startsWith(UPLOAD_PREFIX)).map((k) => k.slice(UPLOAD_PREFIX.length)))];
  const { data = {} } = useQuery({
    queryKey: ["admin-thumbs", paths], enabled: paths.length > 0,
    queryFn: async () => { const r = await supabase.storage.from("product-images").createSignedUrls(paths, 3600); return Object.fromEntries((r.data ?? []).map((x) => [UPLOAD_PREFIX + x.path, x.signedUrl])); },
  });
  return data as Record<string, string>;
}

function PhotoPicker({ src, name, onUploaded }: { src: string; name: string; onUploaded: (key: string) => void }) {
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast.error("Use a JPG, PNG or WebP photo"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5 MB"); return; }
    setBusy(true);
    const path = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    setBusy(false);
    if (error) { toast.error("Upload failed: " + error.message); return; }
    onUploaded(UPLOAD_PREFIX + path);
  };
  return (
    <label className="group relative block h-[72px] w-[72px] cursor-pointer overflow-hidden rounded-xl" title="Change photo">
      <img src={src} alt={name} className="h-full w-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center bg-charcoal/60 text-[10px] font-semibold text-charcoal-foreground opacity-0 transition group-hover:opacity-100">{busy ? "Uploading…" : <><Upload className="mr-1 h-3 w-3" />Change</>}</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => void pick(e.target.files?.[0])} />
    </label>
  );
}

export function DiscountsAdmin() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-discounts"], queryFn: async () => { const r = await supabase.from("discount_codes").select("*").order("code"); if (r.error) throw r.error; return r.data; } });
  const [f, setF] = useState({ code: "", kind: "percent", value: "", min_order: "0" });
  const reload = () => qc.invalidateQueries({ queryKey: ["admin-discounts"] });
  const add = async () => {
    const code = f.code.trim().toUpperCase(), value = Number(f.value);
    if (!/^[A-Z0-9]{3,20}$/.test(code)) { toast.error("Code: 3–20 letters or numbers"); return; }
    if (!(value > 0) || (f.kind === "percent" && value > 100)) { toast.error("Enter a valid discount value"); return; }
    const { error } = await supabase.from("discount_codes").insert({ code, kind: f.kind, value, min_order: Number(f.min_order) || 0 });
    if (error) { toast.error(error.message.includes("duplicate") ? "That code already exists" : error.message); return; }
    setF({ ...f, code: "", value: "" }); toast.success("Discount code added"); reload();
  };
  const toggle = async (code: string, active: boolean) => { const { error } = await supabase.from("discount_codes").update({ active }).eq("code", code); if (error) toast.error(error.message); else reload(); };
  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-2 rounded-2xl bg-card p-4 shadow-warm sm:grid-cols-5">
        <Input placeholder="CODE" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
        <select aria-label="Type" className={sel} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="percent">% off</option><option value="fixed">KES off</option></select>
        <Input type="number" placeholder={f.kind === "percent" ? "Percent" : "Amount (KES)"} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
        <Input type="number" placeholder="Min. order (KES)" value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} />
        <Button className="rounded-full" onClick={add}><Plus className="h-4 w-4" /> Add code</Button>
      </div>
      {!data.length ? <p className="text-muted-foreground">No discount codes yet.</p> :
        <ul className="divide-y rounded-2xl bg-card shadow-warm">{data.map((d) => (
          <li key={d.code} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><p className="font-mono font-bold">{d.code}</p><p className="text-xs text-muted-foreground">{d.kind === "percent" ? `${Number(d.value)}% off` : `KES ${Number(d.value)} off`}{Number(d.min_order) ? ` · min. order KES ${Number(d.min_order)}` : ""}</p></div>
            <label className="flex items-center gap-2 text-xs"><Switch checked={d.active} onCheckedChange={(v) => void toggle(d.code, v)} /> Active</label>
          </li>))}</ul>}
    </div>
  );
}

export function SettingsAdmin() {
  const refresh = useRefresh();
  const { data } = useQuery({ queryKey: ["admin-settings"], queryFn: async () => (await supabase.from("store_settings").select("*").eq("id", 1).maybeSingle()).data });
  if (!data) return <p className="mt-6 text-muted-foreground">Loading settings…</p>;
  const save = async (patch: Database["public"]["Tables"]["store_settings"]["Update"]) => {
    const { error } = await supabase.from("store_settings").update(patch).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); refresh();
  };
  return (
    <div className="mt-6 grid gap-4 rounded-2xl bg-card p-5 shadow-warm sm:grid-cols-2">
      <label className="text-sm">Kitchen opens<Input type="time" defaultValue={data.kitchen_open.slice(0, 5)} onBlur={(e) => e.target.value && save({ kitchen_open: e.target.value })} /></label>
      <label className="text-sm">Kitchen closes<Input type="time" defaultValue={data.kitchen_close.slice(0, 5)} onBlur={(e) => e.target.value && save({ kitchen_close: e.target.value })} /></label>
      <label className="text-sm sm:col-span-2">Announcement bar (top of every page)<Input defaultValue={data.announcement} maxLength={160} onBlur={(e) => e.target.value !== data.announcement && save({ announcement: e.target.value })} /></label>
      <label className="flex items-center gap-2 text-sm"><Switch checked={data.scheduled_enabled} onCheckedChange={(v) => save({ scheduled_enabled: v })} /> Allow scheduled orders</label>
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
