import { useState } from "react";
import { Minus, Plus, ShoppingBag, Clock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { addonsOf, effectivePrice, type Product } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { formatKES, formatQty, lineTotal } from "@/lib/pricing";
import { img } from "@/lib/images";
import { cn } from "@/lib/utils";

export function ProductCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const out = !product.available || Number(product.stock) <= 0;
  const promo = product.promo_price != null;
  return (
    <button
      onClick={onOpen}
      disabled={out}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card text-left shadow-warm transition hover:-translate-y-1 disabled:opacity-60"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={img(product.image_key)} alt={product.name} loading="lazy" width={1024} height={768}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        {promo && <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Offer</span>}
        {out && <span className="absolute inset-0 flex items-center justify-center bg-charcoal/60 font-semibold text-charcoal-foreground">Unavailable</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-leaf sm:text-xs">{product.category}</span>
        <h3 className="text-sm font-semibold leading-tight sm:text-lg">{product.name}</h3>
        {product.serving_info && <p className="hidden text-sm text-muted-foreground sm:block">{product.serving_info}</p>}
        <div className="mt-auto flex items-end justify-between gap-1 pt-2 sm:pt-3">
          <div>
            <span className="text-sm font-bold sm:text-lg">{formatKES(effectivePrice(product))}</span>
            <span className="text-xs text-muted-foreground sm:text-sm"> /{product.unit}</span>
            {promo && <span className="ml-1 hidden text-sm sm:inline text-muted-foreground line-through">{formatKES(Number(product.price))}</span>}
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center sm:h-9 sm:w-9 justify-center rounded-full bg-charcoal text-charcoal-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
            <Plus className="h-4 w-4" />
          </span>
        </div>
      </div>
    </button>
  );
}

const WEIGHT_PRESETS = [0.5, 1, 1.5, 2, 3];

export function AddToCartDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto rounded-2xl p-0">
        {product && <Body key={product.id} product={product} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({ product, onClose }: { product: Product; onClose: () => void }) {
  const cart = useCart();
  const weight = product.sell_type === "weight";
  const min = Number(product.min_qty);
  const step = Number(product.step);
  const [qty, setQty] = useState(weight ? Math.max(1, min) : 1);
  const [prep, setPrep] = useState(product.prep_options[0] ?? "");
  const [addons, setAddons] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const addonList = addonsOf(product);
  const unitPrice = effectivePrice(product) + addonList.filter((a) => addons.includes(a.name)).reduce((s, a) => s + a.price, 0);
  const total = lineTotal(unitPrice, qty);
  const stock = Number(product.stock);

  const add = () => {
    cart.add({
      productId: product.id, name: product.name, imageKey: product.image_key, section: product.section,
      unit: product.unit, sellType: product.sell_type, step, minQty: min, qty, unitPrice,
      prep: prep || undefined, addons, notes: notes.trim() || undefined,
    });
    toast.success(`${product.name} added`, { description: `${formatQty(qty, product.unit)} · ${formatKES(total)}` });
    onClose();
  };

  return (
    <>
      <img src={img(product.image_key)} alt={product.name} className="aspect-[16/9] w-full object-cover" />
      <div className="space-y-5 p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{product.name}</DialogTitle>
          <DialogDescription>{product.description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>{formatKES(effectivePrice(product))} per {product.unit}</span>
          {product.serving_info && <span>· {product.serving_info}</span>}
          {product.prep_minutes && <span className="flex items-center gap-1">· <Clock className="h-3.5 w-3.5" /> ~{product.prep_minutes} min</span>}
        </div>

        {weight && (
          <div>
            <p className="mb-2 text-sm font-semibold">Choose weight</p>
            <div className="flex flex-wrap gap-2">
              {WEIGHT_PRESETS.filter((w) => w >= min && w <= stock).map((w) => (
                <button key={w} onClick={() => setQty(w)}
                  className={cn("rounded-full border px-4 py-1.5 text-sm font-medium", qty === w ? "border-charcoal bg-charcoal text-charcoal-foreground" : "bg-card")}>
                  {formatQty(w, "kg")}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-muted p-3">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" aria-label="Decrease" onClick={() => setQty((q) => Math.max(min, +(q - step).toFixed(3)))}><Minus className="h-4 w-4" /></Button>
            {weight ? (
              <input type="number" inputMode="decimal" step={step} min={min} value={qty} aria-label="Weight in kg"
                onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setQty(v); }}
                onBlur={() => setQty((q) => Math.min(stock, Math.max(min, q)))}
                className="w-20 rounded-md border bg-card px-2 py-1.5 text-center font-semibold" />
            ) : (
              <span className="w-10 text-center text-lg font-semibold">{qty}</span>
            )}
            <Button size="icon" variant="outline" aria-label="Increase" onClick={() => setQty((q) => Math.min(stock, +(q + step).toFixed(3)))}><Plus className="h-4 w-4" /></Button>
          </div>
          <span className="text-sm text-muted-foreground">{formatQty(qty, product.unit)}</span>
        </div>

        {product.prep_options.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">Preparation</p>
            <div className="flex flex-wrap gap-2">
              {product.prep_options.map((o) => (
                <button key={o} onClick={() => setPrep(o)}
                  className={cn("rounded-full border px-4 py-1.5 text-sm", prep === o ? "border-leaf bg-leaf text-leaf-foreground" : "bg-card")}>{o}</button>
              ))}
            </div>
          </div>
        )}

        {addonList.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">Customise your meal</p>
            <div className="space-y-2">
              {addonList.map((a) => (
                <label key={a.name} className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-3 py-2">
                  <span className="flex items-center gap-3">
                    <Checkbox checked={addons.includes(a.name)}
                      onCheckedChange={(c) => setAddons((x) => (c ? [...x, a.name] : x.filter((n) => n !== a.name)))} />
                    {a.name}
                  </span>
                  <span className="text-sm text-muted-foreground">{a.price ? `+${formatKES(a.price)}` : "Free"}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <Textarea placeholder={product.section === "kitchen" ? "Special requests (e.g. well done, no onions)" : "Notes for the butcher (optional)"}
          value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} />

        <div className="sticky bottom-0 -mx-5 -mb-5 border-t bg-background p-4 sm:static sm:m-0 sm:border-0 sm:p-0"><Button size="lg" className="w-full rounded-full text-base font-bold" onClick={add} disabled={qty < min || qty > stock}>
          <ShoppingBag className="mr-2 h-4 w-4" /> Add {formatQty(qty, product.unit)} · {formatKES(total)}
        </Button></div>
      </div>
    </>
  );
}
