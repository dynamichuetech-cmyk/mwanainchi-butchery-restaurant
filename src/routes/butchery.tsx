import { createFileRoute } from "@tanstack/react-router";
import { BUTCHERY_CATEGORIES, catalogQuery, useCatalog } from "@/lib/catalog";
import { CatalogPage } from "@/components/site/CatalogPage";

export const Route = createFileRoute("/butchery")({
  validateSearch: (s: Record<string, unknown>): { category?: string | undefined } => ({ category: typeof s["category"] === "string" ? (s["category"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Butchery — Fresh beef, goat, pork & kienyeji chicken | Mwanainchi" },
      { name: "description", content: "Order fresh meat by the kilo. Choose your weight and how you want it cut." },
      { property: "og:title", content: "Mwanainchi Butchery" },
      { property: "og:description", content: "Fresh cuts by weight, prepared the way you like." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Butchery,
});

function Butchery() {
  const { products } = useCatalog();
  const { category } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CatalogPage eyebrow="Butchery" title="Fresh cuts, weighed for you" categories={BUTCHERY_CATEGORIES}
      intro="Choose any weight from 250 g up, tell us how to prepare it, and we'll cut it fresh on the day."
      products={products.filter((p) => p.section === "butchery")} active={category}
      onCategory={(c) => navigate({ search: { category: c } })} />
  );
}
