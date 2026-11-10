import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, CreditCard, Smartphone, Banknote, Truck, Store, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart";
import { catalogQuery, useCatalog } from "@/lib/catalog";
import { deliveryFee, formatKES, formatQty, lineTotal } from "@/lib/pricing";
import { useDiscount } from "@/lib/useDiscount";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({ meta: [{ title: "Checkout | Mwanainchi" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Checkout,
});

const STEPS = ["Your details", "Delivery or collection", "Delivery area", "Payment", "Review"];
type Method = "mpesa" | "card" | "cash";

function Checkout() {
  const cart = useCart();
  const { zones, settings } = useCatalog();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [c, setC] = useState({ name: "", phone: "", email: user.email ?? "" });
  const [fulfil, setFulfil] = useState<"delivery" | "collection">("delivery");
  const [when, setWhen] = useState<"asap" | "later">("asap");
  const [sched, setSched] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [method, setMethod] = useState<Method>("mpesa");
  const [mpesa, setMpesa] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data,
  });
  const { data: addresses = [] } = useQuery({
    queryKey: ["addresses", user.id],
    queryFn: async () => (await supabase.from("addresses").select("*").order("created_at")).data ?? [],
  });
  useEffect(() => {
    if (profile) setC((x) => ({ ...x, name: x.name || profile.full_name || "", phone: x.phone || profile.phone || "" }));
  }, [profile]);
  useEffect(() => { if (!mpesa && c.phone) setMpesa(c.phone); }, [c.phone]);

  const discount = useDiscount(cart.discountCode, cart.subtotal);
  const zone = zones.find((z) => z.id === zoneId);
  const after = cart.subtotal - discount;
  const fee = fulfil === "delivery" ? deliveryFee(zone ? { fee: Number(zone.fee), min_order: Number(zone.min_order), free_threshold: zone.free_threshold == null ? null : Number(zone.free_threshold) } : null, after) : 0;
  const total = after + fee;
  const belowMin = fulfil === "delivery" && zone && after < Number(zone.min_order);

  if (!cart.items.length)
    return <div className="py-32 text-center"><h1 className="text-3xl font-bold">Your cart is empty</h1><Link to="/shop" search={{ q: undefined, category: undefined }} className="mt-4 inline-block text-primary">Start shopping</Link></div>;

  const phoneOk = (p: string) => /^(?:\+?254|0)(7|1)\d{8}$/.test(p.replace(/\s/g, ""));
  const validate = (): string | null => {
    if (step === 0) {
      if (!c.name.trim()) return "Please enter your name";
      if (!phoneOk(c.phone)) return "Enter a valid Kenyan phone number, e.g. 0712 345 678";
    }
    if (step === 1) {
      if (fulfil === "delivery" && !address.trim()) return "Enter your delivery address";
      if (when === "later" && (!sched || new Date(sched) < new Date())) return "Choose a future time";
    }
    if (step === 2 && fulfil === "delivery") {
      if (!zone) return "Choose your delivery area";
      if (belowMin) return `Minimum order for ${zone.name} is ${formatKES(Number(zone.min_order))}`;
    }
    if (step === 3 && method === "mpesa" && !phoneOk(mpesa)) return "Enter the M-Pesa number to charge";
    return null;
  };
  const next = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setStep((s) => (s === 1 && fulfil === "collection" ? 3 : s + 1));
  };
  const back = () => setStep((s) => (s === 3 && fulfil === "collection" ? 1 : s - 1));

  const place = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("place_order", {
      p: {
        items: cart.items.map((i) => ({ product_id: i.productId, qty: i.qty, prep: i.prep ?? "", addons: i.addons, notes: i.notes ?? "" })),
        fulfilment: fulfil, scheduled_for: when === "later" ? new Date(sched).toISOString() : "",
        contact: { name: c.name.trim(), phone: c.phone.trim(), email: c.email.trim() },
        zone_id: zoneId, address: address.trim(), delivery_notes: notes.trim(),
        payment_method: method, mpesa_phone: method === "mpesa" ? mpesa.trim() : "",
        discount_code: cart.discountCode,
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (profile && (!profile.phone || !profile.full_name)) await supabase.from("profiles").update({ full_name: profile.full_name || c.name, phone: profile.phone || c.phone }).eq("id", user.id);
    cart.clear();
    toast.success("Order placed!");
    navigate({ to: "/orders/$orderId", params: { orderId: data as string } });
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="mb-8 text-5xl font-bold">Checkout</h1>
        <ol className="mb-8 flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
              i === step ? "bg-charcoal text-charcoal-foreground" : i < step ? "bg-leaf text-leaf-foreground" : "bg-muted text-muted-foreground",
              i === 2 && fulfil === "collection" && "line-through opacity-50")}>
              {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>} {s}
            </li>
          ))}
        </ol>

        <div className="space-y-5 rounded-3xl bg-card p-8 shadow-warm">
          {step === 0 && (
            <>
              <h2 className="text-2xl font-bold">Your details</h2>
              <Input placeholder="Full name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
              <Input placeholder="Phone (07xx xxx xxx)" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
              <Input type="email" placeholder="Email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} />
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold">Delivery or collection?</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice active={fulfil === "delivery"} onClick={() => setFulfil("delivery")} icon={<Truck />} title="Delivery" sub="Brought to you by our riders" />
                <Choice active={fulfil === "collection"} onClick={() => setFulfil("collection")} icon={<Store />} title="Collection" sub="Pick up from our shop" />
              </div>
              {fulfil === "delivery" && (
                <>
                  {addresses.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {addresses.map((a) => (
                        <button key={a.id} onClick={() => { setAddress(a.street); setNotes(a.notes ?? ""); if (a.zone_id) setZoneId(a.zone_id); }}
                          className="rounded-full border px-3 py-1.5 text-sm hover:border-charcoal">{a.label}: {a.street.slice(0, 30)}</button>
                      ))}
                    </div>
                  )}
                  <Input placeholder="Street, estate, building & house number" value={address} onChange={(e) => setAddress(e.target.value)} />
                  <Textarea placeholder="Directions for the rider (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice active={when === "asap"} onClick={() => setWhen("asap")} title="As soon as possible" />
                {settings?.scheduled_enabled && <Choice active={when === "later"} onClick={() => setWhen("later")} title="Schedule for later" />}
              </div>
              {when === "later" && <Input type="datetime-local" value={sched} onChange={(e) => setSched(e.target.value)} />}
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-2xl font-bold">Confirm your delivery area</h2>
              <p className="text-sm text-muted-foreground">We currently deliver only to these areas.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {zones.map((z) => (
                  <button key={z.id} onClick={() => setZoneId(z.id)}
                    className={cn("rounded-2xl border p-4 text-left", zoneId === z.id ? "border-charcoal bg-charcoal text-charcoal-foreground" : "hover:border-charcoal")}>
                    <p className="font-semibold">{z.name}</p>
                    <p className="text-sm opacity-70">{formatKES(Number(z.fee))} delivery · {z.eta}</p>
                    <p className="text-xs opacity-60">Min. order {formatKES(Number(z.min_order))}{z.free_threshold ? ` · Free over ${formatKES(Number(z.free_threshold))}` : ""}</p>
                  </button>
                ))}
              </div>
              {belowMin && <p className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4" /> Add {formatKES(Number(zone!.min_order) - after)} more to deliver to {zone!.name}.</p>}
              <p className="text-sm text-muted-foreground">Outside these areas? Choose collection or <Link to="/contact" className="text-primary underline">contact us</Link>.</p>
            </>
          )}
          {step === 3 && (
            <>
              <h2 className="text-2xl font-bold">How would you like to pay?</h2>
              <div className="grid gap-3">
                <Choice active={method === "mpesa"} onClick={() => setMethod("mpesa")} icon={<Smartphone />} title="M-Pesa" sub="You'll get a payment prompt on your phone" />
                <Choice active={method === "card"} onClick={() => setMethod("card")} icon={<CreditCard />} title="Card" sub="Visa or Mastercard via secure hosted checkout" />
                <Choice active={method === "cash"} onClick={() => setMethod("cash")} icon={<Banknote />} title={fulfil === "delivery" ? "Cash on delivery" : "Pay on collection"} sub="Pay when your order arrives" />
              </div>
              {method === "mpesa" && <Input placeholder="M-Pesa number" value={mpesa} onChange={(e) => setMpesa(e.target.value)} />}
            </>
          )}
          {step === 4 && (
            <>
              <h2 className="text-2xl font-bold">Review your order</h2>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <Info l="Name" v={c.name} /><Info l="Phone" v={c.phone} />
                <Info l="Fulfilment" v={fulfil === "delivery" ? `Delivery to ${zone?.name}` : "Collection"} />
                <Info l="When" v={when === "asap" ? "As soon as possible" : new Date(sched).toLocaleString("en-KE")} />
                {fulfil === "delivery" && <Info l="Address" v={address} />}
                <Info l="Payment" v={method === "mpesa" ? `M-Pesa (${mpesa})` : method === "card" ? "Card" : "Cash"} />
              </dl>
            </>
          )}
          <div className="flex justify-between pt-4">
            {step > 0 ? <Button variant="outline" className="rounded-full" onClick={back}>Back</Button> : <Button asChild variant="ghost"><Link to="/cart">Edit cart</Link></Button>}
            {step < 4 ? <Button className="rounded-full px-8 font-bold" onClick={next}>Continue</Button>
              : <Button disabled={busy} className="rounded-full px-8 font-bold" onClick={place}>{busy ? "Placing order…" : `Place order · ${formatKES(total)}`}</Button>}
          </div>
        </div>
      </div>

      <aside className="h-fit space-y-3 rounded-2xl bg-charcoal p-6 text-charcoal-foreground lg:sticky lg:top-28">
        <h2 className="text-2xl font-bold">Order summary</h2>
        <ul className="space-y-2 text-sm">
          {cart.items.map((i) => (
            <li key={i.key} className="flex justify-between gap-2"><span className="opacity-80">{formatQty(i.qty, i.unit)} × {i.name}</span><span>{formatKES(lineTotal(i.unitPrice, i.qty))}</span></li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-charcoal-foreground/20 pt-3 text-sm">
          <Line l="Product subtotal" v={formatKES(cart.subtotal)} />
          <Line l={`Discount${cart.discountCode ? ` (${cart.discountCode})` : ""}`} v={discount ? `− ${formatKES(discount)}` : formatKES(0)} />
          <Line l="Delivery" v={fulfil === "collection" ? "Free (collection)" : zone ? (fee ? formatKES(fee) : "Free") : "Choose area"} />
        </div>
        <div className="flex justify-between border-t border-charcoal-foreground/20 pt-3 text-lg font-bold"><span>Total payable</span><span>{formatKES(total)}</span></div>
      </aside>
    </div>
  );
}

function Choice({ active, onClick, icon, title, sub }: { active: boolean; onClick: () => void; icon?: React.ReactNode; title: string; sub?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex items-center gap-3 rounded-2xl border p-4 text-left transition", active ? "border-primary bg-primary/10 ring-2 ring-primary" : "hover:border-charcoal")}>
      {icon && <span className="text-primary [&_svg]:h-6 [&_svg]:w-6">{icon}</span>}
      <span><span className="block font-semibold">{title}</span>{sub && <span className="text-sm text-muted-foreground">{sub}</span>}</span>
    </button>
  );
}
const Info = ({ l, v }: { l: string; v: string }) => <div className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="font-medium">{v}</dd></div>;
const Line = ({ l, v }: { l: string; v: string }) => <div className="flex justify-between"><span className="opacity-70">{l}</span><span>{v}</span></div>;
