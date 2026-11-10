import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { formatKES, formatQty, lineTotal } from "@/lib/pricing";
import { img } from "@/lib/images";
import { supabase } from "@/integrations/supabase/client";
import { useDiscount } from "@/lib/useDiscount";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart | Mwanainchi" },
      { name: "description", content: "Review your Mwanainchi order before checkout." },
      { property: "og:title", content: "Your cart | Mwanainchi" },
      { property: "og:description", content: "Review your order before checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Cart,
});

function Cart() {
  const cart = useCart();
  const [code, setCode] = useState(cart.discountCode);
  const discount = useDiscount(cart.discountCode, cart.subtotal);

  const apply = async () => {
    if (!code.trim()) return cart.setDiscountCode("");
    const { error } = await supabase.rpc("check_discount", { _code: code.trim(), _subtotal: cart.subtotal });
    if (error) { toast.error(error.message); return; }
    cart.setDiscountCode(code.trim().toUpperCase());
    toast.success("Discount applied");
  };

  if (!cart.items.length)
    return (
      <div className="mx-auto max-w-xl px-4 py-32 text-center">
        <h1 className="text-4xl font-bold">Your cart is empty</h1>
        <p className="mt-3 text-muted-foreground">Fresh cuts and hot meals are a few taps away.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild className="rounded-full"><Link to="/butchery" search={{ category: undefined }}>Shop the butchery</Link></Button>
          <Button asChild variant="outline" className="rounded-full"><Link to="/kitchen" search={{ category: undefined }}>Our Kitchen</Link></Button>
        </div>
      </div>
    );

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="mb-8 text-5xl font-bold">Your cart</h1>
        <ul className="divide-y rounded-2xl bg-card shadow-warm">
          {cart.items.map((i) => (
            <li key={i.key} className="flex gap-4 p-4">
              <img src={img(i.imageKey)} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-leaf">{i.section === "kitchen" ? "Our Kitchen" : i.section === "butchery" ? "Butchery" : "Shop"}</p>
                    <p className="font-semibold">{i.name}</p>
                  </div>
                  <p className="font-bold">{formatKES(lineTotal(i.unitPrice, i.qty))}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatKES(i.unitPrice)} / {i.unit}{i.prep ? ` · ${i.prep}` : ""}{i.addons.length ? ` · ${i.addons.join(", ")}` : ""}
                </p>
                {i.notes && <p className="text-xs italic text-muted-foreground">“{i.notes}”</p>}
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Decrease" onClick={() => cart.setQty(i.key, i.qty - i.step)}><Minus className="h-3 w-3" /></Button>
                    <span className="min-w-16 text-center text-sm font-semibold">{formatQty(i.qty, i.unit)}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Increase" onClick={() => cart.setQty(i.key, i.qty + i.step)}><Plus className="h-3 w-3" /></Button>
                  </div>
                  <button onClick={() => cart.remove(i.key)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /> Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Link to="/shop" search={{ q: undefined, category: undefined }} className="mt-6 inline-block font-semibold text-primary">← Continue shopping</Link>
      </div>
      <aside className="h-fit space-y-4 rounded-2xl bg-charcoal p-6 text-charcoal-foreground lg:sticky lg:top-28">
        <h2 className="text-2xl font-bold">Summary</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Discount code" className="bg-card pl-9 text-card-foreground" />
          </div>
          <Button variant="secondary" onClick={apply}>Apply</Button>
        </div>
        <Row l="Subtotal" v={formatKES(cart.subtotal)} />
        {discount > 0 && <Row l={`Discount (${cart.discountCode})`} v={`− ${formatKES(discount)}`} />}
        <Row l="Delivery" v="Calculated at checkout" />
        <div className="border-t border-charcoal-foreground/20 pt-4"><Row l="Estimated total" v={formatKES(cart.subtotal - discount)} bold /></div>
        <Button asChild size="lg" className="w-full rounded-full font-bold"><Link to="/checkout">Proceed to checkout</Link></Button>
      </aside>
    </div>
  );
}

export function Row({ l, v, bold }: { l: string; v: string; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? "text-lg font-bold" : "text-sm"}`}><span className={bold ? "" : "opacity-70"}>{l}</span><span>{v}</span></div>;
}
