import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatQty } from "@/lib/pricing";
import { useAuth } from "@/lib/auth";
import { assignDelivery, requireAdminAccess } from "@/lib/auth.functions";
import { RiderReview } from "@/components/admin/RiderReview";
import { InventoryAdmin, ProductsAdmin, ZonesAdmin } from "@/components/admin/CatalogAdmin";
import { PAYMENT_LABEL, STATUS_LABEL, timeline } from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/admin_/dashboard")({
  head: () => ({ meta: [{ title: "Admin | Mwanainchi" }, { name: "description", content: "Mwanainchi authorised business dashboard." }, { property: "og:title", content: "Admin | Mwanainchi" }, { property: "og:description", content: "Mwanainchi business administration." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  // UI gate only; the database policies are what actually block non-admins.
  beforeLoad: async () => {
    try { await requireAdminAccess(); }
    catch { throw redirect({ to: "/admin" }); }
  },
  pendingComponent: () => <p role="status" className="py-32 text-center text-muted-foreground">Checking administrator access…</p>,
  component: Admin,
});

function Admin() {
  const { isAdmin, isLoading, logout } = useAuth();
  if (isLoading) return <p role="status" className="py-32 text-center text-muted-foreground">Checking access…</p>;
  if (!isAdmin)
    return <div className="py-32 text-center"><h1 className="text-3xl font-bold">Access denied</h1></div>;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-widest text-leaf">Admin</p>
      <h1 className="text-4xl font-bold sm:text-5xl">Business dashboard</h1>
      <Button variant="outline" className="mt-4 rounded-full" onClick={() => void logout()}>Sign out</Button>
      <Tabs defaultValue="orders" className="mt-8">
        <TabsList className="h-auto w-full flex-wrap justify-start"><TabsTrigger value="orders">Orders</TabsTrigger><TabsTrigger value="products">Products</TabsTrigger><TabsTrigger value="inventory">Inventory</TabsTrigger><TabsTrigger value="zones">Delivery areas</TabsTrigger><TabsTrigger value="riders">Riders</TabsTrigger></TabsList>
        <TabsContent value="orders"><Orders /></TabsContent>
        <TabsContent value="products"><ProductsAdmin /></TabsContent>
        <TabsContent value="inventory"><InventoryAdmin /></TabsContent>
        <TabsContent value="zones"><ZonesAdmin /></TabsContent>
        <TabsContent value="riders"><RiderReview /></TabsContent>
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
              {o.fulfilment === "delivery" && o.status === "ready" && <AssignRider order={o.id} />}
              {o.payment_method === "cash" && o.payment_status === "pending" && <Button size="sm" variant="outline" className="rounded-full" onClick={() => update(o.id, { payment_status: "paid" })}>Cash received</Button>}
              {!["delivered", "collected", "cancelled"].includes(o.status) && <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => update(o.id, { status: "cancelled" })}>Cancel</Button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const Stat = ({ l, v }: { l: string; v: string }) => <div className="rounded-2xl bg-charcoal p-3 text-charcoal-foreground sm:p-5"><p className="text-[11px] opacity-70 sm:text-sm">{l}</p><p className="text-lg font-bold sm:text-2xl">{v}</p></div>;

function AssignRider({ order }: { order: string }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["approved-riders"], queryFn: async () => (await supabase.from("rider_profiles").select("user_id, phone").eq("approval_status", "approved")).data ?? [] });
  return <select aria-label="Assign approved rider" className="h-8 rounded-md border bg-background px-2 text-sm" defaultValue="" onChange={async (e) => { try { await assignDelivery({ data: { order, rider: e.target.value } }); toast.success("Rider assigned"); await qc.invalidateQueries({ queryKey: ["admin-orders"] }); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to assign rider"); } }}><option value="" disabled>Assign rider</option>{data.map((r) => <option key={r.user_id} value={r.user_id}>{r.phone || r.user_id.slice(0, 8)}</option>)}</select>;
}
