import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { AddToCartDialog, ProductCard } from "./AddToCart";

export function ProductGrid({ products }: { products: Product[] }) {
  const [open, setOpen] = useState<Product | null>(null);
  if (!products.length) return <p className="py-16 text-center text-muted-foreground">Nothing here yet — try another category.</p>;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => <ProductCard key={p.id} product={p} onOpen={() => setOpen(p)} />)}
      </div>
      <AddToCartDialog product={open} onClose={() => setOpen(null)} />
    </>
  );
}
