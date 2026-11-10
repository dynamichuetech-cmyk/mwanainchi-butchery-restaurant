import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatQty } from "@/lib/pricing";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { PAYMENT_LABEL, STATUS_LABEL, timeline } from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin | Mwanainchi" }, { name: "robots", content: "noindex" }] }),
  // UI gate only; the database policies are what actually block non-admins.
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    if (error || data !== true) throw redirect({ to: "/account" });
  },
  component: Admin,
});

function Admin() {
  const { user } = Route.useRouteContext();
  const { data: isAdmin, isLoading } = useIsAdmin(user.id);
  if (isLoading) return <p className="py-32 text-center text-muted-foreground">Checking access…</p>;
  if (!isAdmin)
    return <div className="py-32 text-center"><h1 className="text-3xl font-bold">Admins only</h1><Link to="/account" className="text-primary">Back to my account</Link></div>;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-widest text-leaf">Admin</p>
      <h1 className="text-4xl font-bold sm:text-5xl">Business dashboard</h1>
      <Tabs defaultValue="orders" className="mt-8">
        <TabsList><TabsTrigger value="orders">Orders</TabsTrigger><TabsTrigger value="products">Products</TabsTrigger></TabsList>
        <TabsContent value="orders"><Orders /></TabsContent>
        <TabsContent value="products"><Products /></TabsContent>
      </Tabs>
    </div>
  );
}

function Orders() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase.from("orders").select("*, order_items(*), delivery_zones(name)").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  useEffect(() => {
    const ch = supabase.channel(`admin-orders-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => qc.invalidateQueries({ queryKey: ["admin-orders"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  const today = new Date().toDateString();
  const todays = data.filter((o) => new Date(o.created_at).toDateString() === today && o.status !== "cancelled");
  const update = async (id: string, patch: { status?: string; payment_status?: string }) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };
  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat l="Today's orders" v={String(todays.length)} />
        <Stat l="Today's sales" v={formatKES(todays.reduce((s, o) => s + Number(o.total), 0))} />
        <Stat l="Open orders" v={String(data.filter((o) => !["delivered", "collected", "cancelled"].includes(o.status)).length)} />
      </div>
      {!data.length && <p className="py-10 text-muted-foreground">No orders yet.</p>}
      {data.map((o) => {
        const steps = timeline(o.fulfilment);
        const nextStatus = steps[steps.indexOf(o.status) + 1];
        return (
          <div key={o.id} className="rounded-2xl bg-card p-4 shadow-warm sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <p className="font-semibold">{o.order_number} · {STATUS_LABEL[o.status]}</p>
              <p className="font-bold">{formatKES(Number(o.total))}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {o.contact_name} · <a href={`tel:${o.contact_phone}`} className="underline">{o.contact_phone}</a> · {o.fulfilment === "delivery" ? `${(o.delivery_zones as { name: string } | null)?.name}: ${o.address}` : "Collection"}
              {o.scheduled_for ? ` · for ${new Date(o.scheduled_for).toLocaleString("en-KE")}` : ""}
            </p>
            <ul className="mt-2 text-sm">
              {o.order_items.map((i) => {
                const opt = i.options as { prep?: string; addons?: string[]; notes?: string };
                return <li key={i.id}>• {formatQty(Number(i.qty), i.unit)} {i.name}{opt.prep ? ` (${opt.prep})` : ""}{opt.addons?.length ? ` + ${opt.addons.join(", ")}` : ""}{opt.notes ? ` — “${opt.notes}”` : ""}</li>;
              })}
            </ul>
            <p className="mt-2 text-sm">Payment: {o.payment_method.toUpperCase()} · {PAYMENT_LABEL[o.payment_status]}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {nextStatus && o.status !== "cancelled" && <Button size="sm" className="rounded-full" onClick={() => update(o.id, { status: nextStatus })}>Mark {STATUS_LABEL[nextStatus]}</Button>}
              {o.payment_method === "cash" && o.payment_status === "pending" && <Button size="sm" variant="outline" className="rounded-full" onClick={() => update(o.id, { payment_status: "paid" })}>Cash received</Button>}
              {!["delivered", "collected", "cancelled"].includes(o.status) && <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => update(o.id, { status: "cancelled" })}>Cancel</Button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Products() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-products"], queryFn: async () => (await supabase.from("products").select("*").order("sort")).data ?? [] });
  const save = async (id: string, patch: { available?: boolean; price?: number; stock?: number; promo_price?: number | null }) => {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };
  return (
    <ul className="mt-6 divide-y rounded-2xl bg-card shadow-warm">
      {data.map((p) => (
        <li key={p.id} className="grid grid-cols-2 items-center gap-3 p-4 sm:grid-cols-[1fr_120px_120px_120px_auto]">
          <div className="col-span-2 min-w-0 sm:col-span-1"><p className="truncate font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.category} · per {p.unit}</p></div>
          <label className="text-xs">Price<Input type="number" defaultValue={Number(p.price)} onBlur={(e) => Number(e.target.value) !== Number(p.price) && save(p.id, { price: Number(e.target.value) })} /></label>
          <label className="text-xs">Offer price<Input type="number" defaultValue={p.promo_price ?? ""} onBlur={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== (p.promo_price == null ? null : Number(p.promo_price))) save(p.id, { promo_price: v }); }} /></label>
          <label className="text-xs">Stock ({p.unit})<Input type="number" step="0.25" defaultValue={Number(p.stock)} onBlur={(e) => Number(e.target.value) !== Number(p.stock) && save(p.id, { stock: Number(e.target.value) })} /></label>
          <label className="flex items-center gap-2 text-xs"><Switch checked={p.available} onCheckedChange={(v) => save(p.id, { available: v })} /> Available</label>
        </li>
      ))}
    </ul>
  );
}

const Stat = ({ l, v }: { l: string; v: string }) => <div className="rounded-2xl bg-charcoal p-3 text-charcoal-foreground sm:p-5"><p className="text-[11px] opacity-70 sm:text-sm">{l}</p><p className="text-lg font-bold sm:text-2xl">{v}</p></div>;
