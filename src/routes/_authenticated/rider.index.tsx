import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MapPin, Navigation, Phone, Wallet } from "lucide-react";
import { getAuthIdentity, deliveryDetails, updateDelivery, updateMyLocation } from "@/lib/auth.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/pricing";
import { riderEarnings } from "@/lib/rider-earnings";

export const Route = createFileRoute("/_authenticated/rider/")({
  head: () => ({ meta: [{ title: "Rider deliveries | Mwanainchi" }, { name: "description", content: "Your authorised Mwanainchi delivery assignments." }, { property: "og:title", content: "Rider deliveries | Mwanainchi" }, { property: "og:description", content: "Assigned deliveries." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => { const i = await getAuthIdentity(); if (i.riderStatus !== "approved") throw redirect({ to: "/rider/status" }); },
  component: Rider,
});

type Delivery = Awaited<ReturnType<typeof deliveryDetails>>[number];
const LABEL: Record<string, string> = { assigned: "Assigned", out_for_delivery: "On the way", delivered: "Delivered" };

function Rider() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["rider-deliveries", auth.user?.id], queryFn: () => deliveryDetails(), refetchInterval: 30_000 });
  const list = q.data ?? [];
  const active = list.filter((a) => a.status !== "delivered");
  const done = list.filter((a) => a.status === "delivered");
  const earn = riderEarnings(list, new Date());

  async function update(a: Delivery, status: "out_for_delivery" | "delivered") {
    setBusy(a.id);
    try { await updateDelivery({ data: { id: a.id, status } }); toast.success(status === "delivered" ? "Delivery completed" : "Delivery started — sharing your location"); await qc.invalidateQueries({ queryKey: ["rider-deliveries"] }); }
    catch { toast.error("Unable to update delivery. Check your approval and assignment."); }
    finally { setBusy(null); }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm text-leaf">Delivery Rider</p><h1 className="text-3xl font-bold">Your deliveries</h1><p className="mt-1 text-muted-foreground">{auth.profile?.full_name}</p></div>
        <Button variant="outline" className="rounded-full" onClick={() => void auth.logout()}>Sign out</Button>
      </div>

      <section aria-label="Earnings" className="mt-6 grid grid-cols-3 gap-3">
        <Stat l="Today" v={formatKES(earn.today)} s={`${earn.todayCount} deliveries`} />
        <Stat l="This week" v={formatKES(earn.week)} s={`${earn.weekCount} deliveries`} />
        <Stat l="All time" v={formatKES(earn.total)} s={`${done.length} deliveries`} />
      </section>
      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Wallet className="h-3 w-3" /> Earnings are the delivery fee of each completed order.</p>

      {q.isPending ? <p role="status" className="py-12">Loading deliveries…</p>
        : q.isError ? <p role="alert" className="py-12 text-destructive">Delivery access unavailable.</p>
        : <>
          <h2 className="mt-8 text-xl font-bold">Active ({active.length})</h2>
          {!active.length ? <p className="py-6 text-muted-foreground">No active deliveries. New assignments appear here automatically.</p> :
            <ul className="mt-3 space-y-3">{active.map((a) => (
              <li key={a.id} className="rounded-2xl bg-card p-4 shadow-warm sm:p-5">
                <div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">Order {a.order_number} · {LABEL[a.status] ?? a.status}</p><p className="text-sm font-bold">You earn {formatKES(a.delivery_fee)}</p></div>
                <p className="mt-1 text-sm">{a.contact_name} · <a className="inline-flex items-center gap-1 underline" href={`tel:${a.contact_phone}`}><Phone className="h-3 w-3" />{a.contact_phone}</a></p>
                <p className="text-sm text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3" />{a.zone ? `${a.zone}: ` : ""}{a.address}{a.notes ? ` · ${a.notes}` : ""}</p>
                {a.payment_method === "cash" && a.payment_status !== "paid" && <p className="mt-1 text-sm font-semibold text-primary">Collect cash: {formatKES(a.total)}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {a.address && <Button asChild size="sm" variant="outline" className="rounded-full"><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${a.address}, ${a.zone ?? ""}, Nairobi`)}`}><Navigation className="h-4 w-4" /> Directions</a></Button>}
                  <Button size="sm" className="rounded-full" disabled={busy === a.id} onClick={() => void update(a, a.status === "assigned" ? "out_for_delivery" : "delivered")}>{a.status === "assigned" ? "Start delivery" : "Mark delivered"}</Button>
                </div>
                {a.status === "out_for_delivery" && <LocationSharer delivery={a} />}
              </li>))}</ul>}
          <h2 className="mt-8 text-xl font-bold">Completed</h2>
          {!done.length ? <p className="py-6 text-muted-foreground">No completed deliveries yet.</p> :
            <ul className="mt-3 divide-y rounded-2xl bg-card shadow-warm">{done.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 p-4 text-sm"><span>Order {a.order_number} · {a.zone ?? "—"} · {new Date(a.updated_at).toLocaleDateString("en-KE")}</span><span className="font-semibold">{formatKES(a.delivery_fee)}</span></li>))}</ul>}
        </>}
    </div>
  );
}

function LocationSharer({ delivery }: { delivery: Delivery }) {
  const [on, setOn] = useState(true);
  const [msg, setMsg] = useState("");
  const last = useRef(0);
  useEffect(() => {
    if (!on) return;
    if (!("geolocation" in navigator)) { setMsg("Location isn't available on this device."); return; }
    const id = navigator.geolocation.watchPosition(async (pos) => {
      if (Date.now() - last.current < 20_000) return; // send at most every 20s
      last.current = Date.now();
      try { await updateMyLocation({ data: { id: delivery.id, latitude: pos.coords.latitude, longitude: pos.coords.longitude } }); setMsg(`Location shared at ${new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`); }
      catch { setMsg("Couldn't share location — will retry."); last.current = 0; }
    }, (err) => setMsg(err.code === err.PERMISSION_DENIED ? "Allow location access in your browser to share your position." : "Waiting for GPS signal…"), { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 });
    return () => navigator.geolocation.clearWatch(id);
  }, [on, delivery.id]);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-muted p-3 text-sm">
      <span className={on ? "h-2 w-2 animate-pulse rounded-full bg-leaf" : "h-2 w-2 rounded-full bg-muted-foreground"} aria-hidden />
      <span className="flex-1">{on ? msg || "Sharing live location…" : "Location sharing paused"}</span>
      <Button size="sm" variant="ghost" onClick={() => setOn((v) => !v)}>{on ? "Pause" : "Resume"}</Button>
    </div>
  );
}

const Stat = ({ l, v, s }: { l: string; v: string; s: string }) => <div className="rounded-2xl bg-charcoal p-3 text-charcoal-foreground sm:p-5"><p className="text-[11px] opacity-70 sm:text-sm">{l}</p><p className="text-base font-bold sm:text-2xl">{v}</p><p className="text-[11px] opacity-60">{s}</p></div>;
