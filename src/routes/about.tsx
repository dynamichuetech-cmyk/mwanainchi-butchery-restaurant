import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import platter from "@/assets/platter.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Mwanainchi — Butchery & Kitchen" },
      { name: "description", content: "A modern Kenyan food destination for fresh meat, groceries and prepared meals." },
      { property: "og:title", content: "About Mwanainchi" },
      { property: "og:description", content: "Freshness You Can Taste. Quality You Can Trust." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 md:grid-cols-2">
      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-leaf">About Mwanainchi</p>
        <h1 className="text-5xl font-bold">Freshness you can taste. Quality you can trust.</h1>
        <p className="mt-6 text-lg text-muted-foreground">Mwanainchi is a modern Kenyan food destination bringing together a premium butchery, quality groceries and a kitchen serving the flavours we grew up with — nyama choma, kienyeji chicken and generous platters.</p>
        <p className="mt-4 text-lg text-muted-foreground">We serve Utawala, Kasarani, Riruta and Embakasi East with our own delivery team, so your order arrives fresh, hot and on time.</p>
        <div className="mt-8 flex gap-3">
          <Button asChild className="rounded-full px-6 font-bold"><Link to="/butchery" search={{ category: undefined }}>Shop the butchery</Link></Button>
          <Button asChild variant="outline" className="rounded-full px-6"><Link to="/contact">Get in touch</Link></Button>
        </div>
      </div>
      <img src={platter} alt="Mwanainchi family platter" loading="lazy" className="rounded-3xl shadow-warm" />
    </div>
  );
}
