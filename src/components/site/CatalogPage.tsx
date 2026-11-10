import { ProductGrid } from "./ProductGrid";
import type { Product } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function CatalogPage({ eyebrow, title, intro, categories, products, active, onCategory, children }: {
  eyebrow: string; title: string; intro: string; categories: string[]; products: Product[];
  active?: string | undefined; onCategory: (c?: string) => void; children?: React.ReactNode;
}) {
  const shown = active ? products.filter((p) => p.category === active) : products;
  return (
    <div className="mx-auto max-w-7xl px-4 py-14">
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-leaf">{eyebrow}</p>
      <h1 className="text-5xl font-bold md:text-6xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{intro}</p>
      {children}
      <div className="my-8 flex flex-wrap gap-2">
        {[undefined, ...categories].map((c) => (
          <button key={c ?? "all"} onClick={() => onCategory(c)}
            className={cn("rounded-full border px-4 py-2 text-sm font-medium transition", active === c ? "border-charcoal bg-charcoal text-charcoal-foreground" : "bg-card hover:border-charcoal")}>
            {c ?? "All"}
          </button>
        ))}
      </div>
      <ProductGrid products={shown} />
    </div>
  );
}
