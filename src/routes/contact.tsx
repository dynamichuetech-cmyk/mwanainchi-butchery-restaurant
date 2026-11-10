import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Mwanainchi" },
      { name: "description", content: "Questions about an order, bulk meat or catering? Send us a message." },
      { property: "og:title", content: "Contact Mwanainchi" },
      { property: "og:description", content: "Get in touch with the Mwanainchi team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [f, setF] = useState({ name: "", email: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("contact_messages").insert({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() || null, message: f.message.trim() });
    setBusy(false);
    if (error) { toast.error("Could not send your message. Please check the fields."); return; }
    setF({ name: "", email: "", phone: "", message: "" });
    toast.success("Thanks! We'll get back to you shortly.");
  };
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-2">
      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-leaf">Contact</p>
        <h1 className="text-5xl font-bold">Let's talk food.</h1>
        <p className="mt-4 text-lg text-muted-foreground">Bulk orders, events, catering or a question about your delivery — send us a note.</p>
        <div className="mt-8 space-y-3">
          <p className="flex items-center gap-2 font-semibold"><MapPin className="h-5 w-5 text-primary" /> Delivery areas</p>
          <div className="flex flex-wrap gap-2">{["Utawala", "Kasarani", "Riruta", "Embakasi East"].map((z) => <span key={z} className="rounded-full bg-card px-4 py-2 text-sm shadow-warm">{z}</span>)}</div>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-3xl bg-card p-8 shadow-warm">
        <Input required maxLength={100} placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input required type="email" maxLength={255} placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <Input maxLength={30} placeholder="Phone (optional)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <Textarea required maxLength={2000} rows={5} placeholder="How can we help?" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
        <Button disabled={busy} className="w-full rounded-full font-bold">Send message</Button>
      </form>
    </div>
  );
}
