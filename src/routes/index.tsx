import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Beef, Truck, ShieldCheck, Leaf, Smartphone, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { catalogQuery, useCatalog } from "@/lib/catalog";
import { ProductGrid } from "@/components/site/ProductGrid";
import { img } from "@/lib/images";
import hero from "@/assets/hero.jpg";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mwanainchi — Fresh Cuts. Bold Flavours. Delivered." },
      { name: "description", content: "Fresh meat, quality groceries and delicious prepared meals from Mwanainchi, delivered across Nairobi." },
      { property: "og:title", content: "Mwanainchi — Fresh Cuts. Bold Flavours. Delivered." },
      { property: "og:description", content: "Butchery, Our Kitchen and groceries in one place. Pay with M-Pesa, card or cash." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Home,
});

const CATS = [
  { label: "Beef", key: "beef", to: "/butchery" as const, cat: "Beef" },
  { label: "Goat & Lamb", key: "beef", to: "/butchery" as const, cat: "Goat & Lamb" },
  { label: "Pork", key: "pork", to: "/butchery" as const, cat: "Pork" },
  { label: "Kienyeji Chicken", key: "chicken", to: "/butchery" as const, cat: "Kienyeji Chicken" },
  { label: "Fish", key: "fish", to: "/butchery" as const, cat: "Fish" },
  { label: "Drinks", key: "drinks", to: "/shop" as const, cat: "Drinks" },
  { label: "Prepared Meals", key: "platter", to: "/kitchen" as const, cat: undefined },
];

function Home() {
  const { products } = useCatalog();
  const best = products.filter((p) => p.bestseller && p.section !== "kitchen").slice(0, 4);
  const offers = products.filter((p) => p.promo_price != null).slice(0, 4);
  const meals = products.filter((p) => p.section === "kitchen" && p.featured).slice(0, 4);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-charcoal text-charcoal-foreground">
        <img src={hero} alt="Charcoal-grilled steaks and fresh cuts" width={1920} height={1088} className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-charcoal via-charcoal/70 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 py-28 md:py-40">
          <p className="animate-rise mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-primary">Freshness You Can Taste</p>
          <h1 className="animate-rise max-w-3xl text-5xl font-bold leading-[1.02] md:text-7xl">Fresh Cuts. Bold Flavours. Delivered.</h1>
          <p className="animate-rise mt-6 max-w-xl text-lg text-charcoal-foreground/80">Discover fresh cuts, quality ingredients and delicious meals, all in one place.</p>
          <div className="animate-rise mt-10 flex flex-wrap gap-4">
            <Button asChild size="lg" className="rounded-full px-8 text-base font-bold"><Link to="/butchery" search={{ category: undefined }}>Shop Fresh Meat <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-charcoal-foreground/40 bg-transparent px-8 text-base text-charcoal-foreground hover:bg-charcoal-foreground/10 hover:text-charcoal-foreground"><Link to="/kitchen" search={{ category: undefined }}>Explore Our Kitchen</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <SectionHead eyebrow="Browse" title="Shop by category" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {CATS.map((c) => (
            <Link key={c.label} to={c.to} search={{ category: c.cat, ...(c.to === "/shop" ? { q: undefined } : {}) } as never}
              className="group relative aspect-[3/4] overflow-hidden rounded-2xl">
              <img src={img(c.key)} alt={c.label} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 to-transparent" />
              <span className="absolute bottom-3 left-3 right-3 font-display text-lg font-semibold text-charcoal-foreground">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <SectionHead eyebrow="Customer favourites" title="Bestsellers" link={{ to: "/butchery", label: "Visit the butchery" }} />
        <ProductGrid products={best} />
      </section>

      <section className="bg-primary/10 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead eyebrow="This week" title="Special offers" link={{ to: "/shop", label: "See all products" }} />
          <ProductGrid products={offers} />
        </div>
      </section>

      <section className="bg-charcoal py-20 text-charcoal-foreground">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 grid items-end gap-6 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-primary">Our Kitchen</p>
              <h2 className="text-4xl font-bold md:text-5xl">Off the grill, onto your table.</h2>
            </div>
            <p className="text-charcoal-foreground/70">Nyama choma, grilled kienyeji chicken, burgers and family platters — cooked to order for delivery, collection or a time that suits you.</p>
          </div>
          <div className="[&_button]:text-card-foreground"><ProductGrid products={meals} /></div>
          <Button asChild size="lg" className="mt-10 rounded-full px-8 font-bold"><Link to="/kitchen" search={{ category: undefined }}>Order from Our Kitchen</Link></Button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <SectionHead eyebrow="The Mwanainchi promise" title="Why choose Mwanainchi?" />
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { i: Beef, t: "Cut fresh daily", d: "Every order is cut and weighed by our butchers on the day." },
            { i: Leaf, t: "Locally sourced", d: "Grass-fed beef, local goat and true kienyeji chicken." },
            { i: Truck, t: "Our own riders", d: "Delivered by the Mwanainchi team, tracked live." },
            { i: ShieldCheck, t: "Pay your way", d: "M-Pesa, card or cash on delivery." },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="rounded-2xl border bg-card p-6">
              <I className="mb-4 h-8 w-8 text-leaf" />
              <h3 className="mb-2 text-xl font-semibold">{t}</h3>
              <p className="text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-leaf py-20 text-leaf-foreground">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-12 text-4xl font-bold">How ordering works</h2>
          <div className="grid gap-8 md:grid-cols-4">
            {["Choose your cuts or meals", "Pick weight, prep & extras", "Pay with M-Pesa, card or cash", "Track your rider to your door"].map((s, i) => (
              <div key={s}>
                <span className="font-display text-6xl font-bold opacity-40">0{i + 1}</span>
                <p className="mt-2 text-lg font-semibold">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <SectionHead eyebrow="Reviews" title="Loved across Nairobi" />
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { q: "The goat choma is the best in Utawala. Delivered hot and on time.", n: "Wanjiru K.", a: "Utawala" },
            { q: "I order my weekly beef here — always fresh, always exactly the weight I asked for.", n: "Brian O.", a: "Embakasi East" },
            { q: "The family platter fed all of us with leftovers. M-Pesa payment was instant.", n: "Faith M.", a: "Kasarani" },
          ].map((t) => (
            <figure key={t.n} className="rounded-2xl bg-card p-8 shadow-warm">
              <div className="mb-4 flex gap-1 text-primary">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
              <blockquote className="font-display text-xl leading-snug">“{t.q}”</blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">{t.n} · {t.a}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <Newsletter />
    </>
  );
}

function SectionHead({ eyebrow, title, link }: { eyebrow: string; title: string; link?: { to: "/butchery" | "/shop"; label: string } }) {
  return (
    <div className="mb-10 flex items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-leaf">{eyebrow}</p>
        <h2 className="text-4xl font-bold md:text-5xl">{title}</h2>
      </div>
      {link && <Link to={link.to} search={{ category: undefined, q: undefined } as never} className="hidden items-center gap-1 font-semibold text-primary md:flex">{link.label} <ArrowRight className="h-4 w-4" /></Link>}
    </div>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error("Please enter a valid email"); return; }
    setBusy(true);
    const { error } = await supabase.from("contact_messages").insert({ name: "Newsletter", email: email.trim(), message: "Newsletter signup", kind: "newsletter" });
    setBusy(false);
    if (error) { toast.error("Could not subscribe, please try again"); return; }
    setEmail("");
    toast.success("You're on the list! Watch out for fresh offers.");
  };
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20">
      <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary p-10 text-primary-foreground md:flex-row md:items-center md:p-14">
        <div>
          <Smartphone className="mb-3 h-8 w-8" />
          <h2 className="text-3xl font-bold md:text-4xl">Get weekly offers first</h2>
          <p className="mt-2 opacity-80">Fresh deals on cuts and meals, straight to your inbox.</p>
        </div>
        <form onSubmit={submit} className="flex w-full max-w-md gap-2">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
            className="flex-1 rounded-full bg-card px-5 py-3 text-card-foreground outline-none" />
          <Button disabled={busy} className="rounded-full bg-charcoal px-6 text-charcoal-foreground hover:bg-charcoal/90">Subscribe</Button>
        </form>
      </div>
    </section>
  );
}
