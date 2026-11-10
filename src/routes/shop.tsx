import { createFileRoute } from "@tanstack/react-router";
import { catalogQuery, useCatalog } from "@/lib/catalog";
import { CatalogPage } from "@/components/site/CatalogPage";

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): { category?: string | undefined; q?: string | undefined } => ({
    category: typeof s["category"] === "string" ? (s["category"] as string) : undefined,
    q: typeof s["q"] === "string" ? (s["q"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop All — Meat, meals & drinks | Mwanainchi" },
      { name: "description", content: "Browse every Mwanainchi product: fresh meat, prepared meals and drinks." },
      { property: "og:title", content: "Shop All at Mwanainchi" },
      { property: "og:description", content: "Fresh meat, prepared meals and drinks in one cart." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Shop,
});

function Shop() {
  const { products } = useCatalog();
  const { category, q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const term = q?.toLowerCase();
  const list = term ? products.filter((p) => `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(term)) : products;
  const cats = Array.from(new Set(products.map((p) => p.category)));
  return (
    <CatalogPage eyebrow="Shop All" title={q ? `Results for “${q}”` : "Everything, one cart"} categories={cats}
      intro="Mix fresh cuts, cooked meals and drinks in a single order." products={list} active={category}
      onCategory={(c) => navigate({ search: { category: c, q } })} />
  );
}
