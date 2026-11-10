import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, RotateCcw, LogOut } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, useCatalog } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { formatKES } from "@/lib/pricing";
import { PAYMENT_LABEL, STATUS_LABEL } from "@/lib/orders";
import { useIsAdmin } from "@/lib/useIsAdmin";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "My Account | Mwanainchi" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Account,
});

function Account() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { data: isAdmin } = useIsAdmin(user.id);
  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/" }); };
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-leaf">My Account</p>
          <h1 className="text-4xl font-bold sm:text-5xl">Karibu tena.</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex gap-2">{isAdmin && <Button asChild className="rounded-full"><Link to="/admin">Admin dashboard</Link></Button>}<Button variant="outline" className="rounded-full" onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Sign out</Button></div>
      </div>
      <Tabs defaultValue="orders" className="mt-10">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><Orders /></TabsContent>
        <TabsContent value="payments"><Payments /></TabsContent>
        <TabsContent value="addresses"><Addresses userId={user.id} /></TabsContent>
        <TabsContent value="profile"><Profile userId={user.id} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Orders() {
  const { products } = useCatalog();
  const cart = useCart();
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => (await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false })).data ?? [],
  });
  const reorder = (items: { product_id: string | null; qty: number; options: unknown }[]) => {
    let added = 0;
    for (const it of items) {
      const p = products.find((x) => x.id === it.product_id);
      if (!p || !p.available) continue;
      const opt = it.options as { prep?: string; addons?: string[]; notes?: string };
      const addonList = Array.isArray(p.customisations) ? (p.customisations as { name: string; price: number }[]) : [];
      const addons = (opt.addons ?? []).filter((a) => addonList.some((x) => x.name === a));
      const unitPrice = Number(p.promo_price ?? p.price) + addonList.filter((a) => addons.includes(a.name)).reduce((s, a) => s + a.price, 0);
      cart.add({ productId: p.id, name: p.name, imageKey: p.image_key, section: p.section, unit: p.unit, sellType: p.sell_type,
        step: Number(p.step), minQty: Number(p.min_qty), qty: Number(it.qty), unitPrice, prep: opt.prep, addons, notes: opt.notes });
      added++;
    }
    if (!added) { toast.error("Those items are no longer available"); return; }
    toast.success("Items added to your cart at today's prices");
    navigate({ to: "/cart" });
  };
  if (isLoading) return <p className="py-10 text-muted-foreground">Loading…</p>;
  if (!data.length) return <div className="py-16 text-center"><p className="text-muted-foreground">No orders yet.</p><Button asChild className="mt-4 rounded-full"><Link to="/butchery" search={{ category: undefined }}>Start shopping</Link></Button></div>;
  return (
    <ul className="mt-6 space-y-3">
      {data.map((o) => (
        <li key={o.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 shadow-warm">
          <div>
            <p className="font-semibold">{o.order_number} · {STATUS_LABEL[o.status]}</p>
            <p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString("en-KE")} · {o.order_items.length} item(s) · {formatKES(Number(o.total))}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => reorder(o.order_items)}><RotateCcw className="mr-1 h-3 w-3" /> Reorder</Button>
            <Button asChild size="sm" className="rounded-full"><Link to="/orders/$orderId" params={{ orderId: o.id }}>Track / details</Link></Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Payments() {
  const { data = [] } = useQuery({
    queryKey: ["my-payments"],
    queryFn: async () => (await supabase.from("payments").select("*, orders(order_number, payment_status)").order("created_at", { ascending: false })).data ?? [],
  });
  if (!data.length) return <p className="py-10 text-muted-foreground">No payments yet.</p>;
  return (
    <ul className="mt-6 divide-y rounded-2xl bg-card shadow-warm">
      {data.map((p) => (
        <li key={p.id} className="flex justify-between gap-4 p-4 text-sm">
          <span>{(p.orders as { order_number: string } | null)?.order_number} · {p.method === "mpesa" ? "M-Pesa" : p.method === "card" ? "Card" : "Cash"} · {new Date(p.created_at).toLocaleDateString("en-KE")}</span>
          <span className="font-semibold">{formatKES(Number(p.amount))} · {PAYMENT_LABEL[(p.orders as { payment_status: string } | null)?.payment_status ?? "pending"]}</span>
        </li>
      ))}
    </ul>
  );
}

function Addresses({ userId }: { userId: string }) {
  const { zones } = useCatalog();
  const qc = useQueryClient();
  const [f, setF] = useState({ label: "Home", street: "", notes: "", zone_id: "" });
  const { data = [] } = useQuery({ queryKey: ["addresses", userId], queryFn: async () => (await supabase.from("addresses").select("*").order("created_at")).data ?? [] });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.street.trim() || !f.zone_id) { toast.error("Add a street address and delivery area"); return; }
    const { error } = await supabase.from("addresses").insert({ user_id: userId, label: f.label.trim() || "Home", street: f.street.trim(), notes: f.notes.trim() || null, zone_id: f.zone_id });
    if (error) { toast.error(error.message); return; }
    setF({ label: "Home", street: "", notes: "", zone_id: "" });
    qc.invalidateQueries({ queryKey: ["addresses", userId] });
    toast.success("Address saved");
  };
  const del = async (id: string) => { await supabase.from("addresses").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["addresses", userId] }); };
  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <ul className="space-y-3">
        {data.map((a) => (
          <li key={a.id} className="flex justify-between gap-2 rounded-2xl bg-card p-4 shadow-warm">
            <div><p className="font-semibold">{a.label} · {zones.find((z) => z.id === a.zone_id)?.name}</p><p className="text-sm text-muted-foreground">{a.street}</p></div>
            <button aria-label="Delete address" onClick={() => del(a.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
          </li>
        ))}
        {!data.length && <p className="text-muted-foreground">No saved addresses yet.</p>}
      </ul>
      <form onSubmit={save} className="space-y-3 rounded-2xl bg-card p-6 shadow-warm">
        <h3 className="text-xl font-semibold">Add address</h3>
        <Input placeholder="Label (Home, Work…)" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
        <Select value={f.zone_id} onValueChange={(v) => setF({ ...f, zone_id: v })}>
          <SelectTrigger><SelectValue placeholder="Delivery area" /></SelectTrigger>
          <SelectContent>{zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Street, estate, house number" value={f.street} onChange={(e) => setF({ ...f, street: e.target.value })} />
        <Input placeholder="Directions (optional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        <Button className="w-full rounded-full">Save address</Button>
      </form>
    </div>
  );
}

function Profile({ userId }: { userId: string }) {
  const [f, setF] = useState({ full_name: "", phone: "" });
  const { data } = useQuery({ queryKey: ["profile", userId], queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()).data });
  useEffect(() => { if (data) setF({ full_name: data.full_name ?? "", phone: data.phone ?? "" }); }, [data]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").upsert({ id: userId, full_name: f.full_name.trim(), phone: f.phone.trim() });
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
  };
  return (
    <form onSubmit={save} className="mt-6 max-w-md space-y-3 rounded-2xl bg-card p-6 shadow-warm">
      <Input placeholder="Full name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
      <Input placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <Button className="rounded-full">Save profile</Button>
    </form>
  );
}
