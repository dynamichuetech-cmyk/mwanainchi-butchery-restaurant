import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatQty } from "@/lib/pricing";
import { PAYMENT_LABEL, STATUS_LABEL, timeline } from "@/lib/orders";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  head: () => ({ meta: [{ title: "Track your order | Mwanainchi" }, { name: "description", content: "View your Mwanainchi order status and receipt." }, { property: "og:title", content: "Track your order | Mwanainchi" }, { property: "og:description", content: "Your Mwanainchi delivery or collection progress." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: OrderPage,
});

function OrderPage() {
  const { orderId } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const [o, items, events] = await Promise.all([
        supabase.from("orders").select("*, delivery_zones(name, eta)").eq("id", orderId).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
        supabase.from("order_events").select("*").eq("order_id", orderId).order("created_at"),
      ]);
      return { order: o.data, items: items.data ?? [], events: events.data ?? [] };
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`order-${orderId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, () => qc.invalidateQueries({ queryKey: ["order", orderId] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_events", filter: `order_id=eq.${orderId}` }, () => qc.invalidateQueries({ queryKey: ["order", orderId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId, qc]);

  if (isLoading) return <p className="py-32 text-center text-muted-foreground">Loading your order…</p>;
  const o = data?.order;
  if (!o) return <div className="py-32 text-center"><h1 className="text-3xl font-bold">Order not found</h1><Link to="/account" className="text-primary">Back to my account</Link></div>;

  const steps = timeline(o.fulfilment);
  const cancelled = o.status === "cancelled";
  const current = steps.indexOf(o.status);
  const at = (s: string) => data?.events.find((e) => e.status === s)?.created_at;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-14">
      <Link to="/account" className="text-sm text-primary">← My orders</Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-leaf">Order {o.order_number}</p>
          <h1 className="text-4xl font-bold sm:text-5xl">{STATUS_LABEL[o.status]}</h1>
          <p className="mt-2 text-muted-foreground">
            {o.fulfilment === "delivery" ? `Delivery to ${(o as { delivery_zones?: { name: string; eta: string } }).delivery_zones?.name ?? ""} · est. ${(o as { delivery_zones?: { eta: string } }).delivery_zones?.eta ?? ""}` : "Collection from our shop"}
            {o.scheduled_for ? ` · scheduled ${new Date(o.scheduled_for).toLocaleString("en-KE")}` : ""}
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm"><span className="h-2 w-2 animate-pulse rounded-full bg-leaf" /> Live updates on</span>
      </div>

      {!cancelled && (
        <ol className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-6 sm:gap-4">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 sm:flex-col sm:text-center">
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
                i <= current ? "border-leaf bg-leaf text-leaf-foreground" : "border-border bg-card text-muted-foreground")}>
                {i <= current ? <Check className="h-5 w-5" /> : i + 1}
              </span>
              <span>
                <span className={cn("block text-sm font-semibold", i > current && "text-muted-foreground")}>{STATUS_LABEL[s]}</span>
                {at(s) && <span className="text-xs text-muted-foreground">{new Date(at(s) ?? "").toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}

      {o.payment_status === "awaiting_payment" && (
        <div className="mt-8 flex gap-3 rounded-2xl border border-primary bg-primary/10 p-5 text-sm">
          <Info className="h-5 w-5 shrink-0 text-primary" />
          <p>{o.payment_method === "mpesa" ? `We'll send an M-Pesa prompt to ${o.mpesa_phone}. Your order is confirmed as paid only once Safaricom confirms the payment.` : "You'll be sent a secure card payment link. Your order is marked paid only after the payment provider confirms it."}</p>
        </div>
      )}

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_320px]">
        <ul className="divide-y rounded-2xl bg-card shadow-warm">
          {data?.items.map((i) => {
            const opt = i.options as { prep?: string; addons?: string[]; notes?: string };
            return (
              <li key={i.id} className="flex justify-between gap-4 p-4">
                <div>
                  <p className="font-semibold">{i.name}</p>
                  <p className="text-sm text-muted-foreground">{formatQty(Number(i.qty), i.unit)} × {formatKES(Number(i.unit_price))}{opt.prep ? ` · ${opt.prep}` : ""}{opt.addons?.length ? ` · ${opt.addons.join(", ")}` : ""}</p>
                  {opt.notes && <p className="text-xs italic text-muted-foreground">“{opt.notes}”</p>}
                </div>
                <p className="font-semibold">{formatKES(Number(i.line_total))}</p>
              </li>
            );
          })}
        </ul>
        <aside className="h-fit space-y-2 rounded-2xl bg-charcoal p-6 text-sm text-charcoal-foreground">
          <R l="Subtotal" v={formatKES(Number(o.subtotal))} />
          <R l="Discount" v={`− ${formatKES(Number(o.discount))}`} />
          <R l="Delivery" v={formatKES(Number(o.delivery_fee))} />
          <div className="flex justify-between border-t border-charcoal-foreground/20 pt-3 text-lg font-bold"><span>Total</span><span>{formatKES(Number(o.total))}</span></div>
          <R l="Payment" v={`${o.payment_method === "mpesa" ? "M-Pesa" : o.payment_method === "card" ? "Card" : "Cash"} · ${PAYMENT_LABEL[o.payment_status]}`} />
        </aside>
      </div>
    </div>
  );
}
const R = ({ l, v }: { l: string; v: string }) => <div className="flex justify-between gap-2"><span className="opacity-70">{l}</span><span className="text-right">{v}</span></div>;
