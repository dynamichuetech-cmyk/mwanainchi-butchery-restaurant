import { createFileRoute } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { KITCHEN_CATEGORIES, catalogQuery, useCatalog } from "@/lib/catalog";
import { CatalogPage } from "@/components/site/CatalogPage";
import { MealAdvisor } from "@/components/site/MealAdvisor";

export const Route = createFileRoute("/kitchen")({
  validateSearch: (s: Record<string, unknown>): { category?: string | undefined } => ({ category: typeof s["category"] === "string" ? (s["category"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Our Kitchen — Nyama choma, grilled chicken & platters | Mwanainchi" },
      { name: "description", content: "Order prepared meals for delivery, collection or a scheduled time." },
      { property: "og:title", content: "Our Kitchen at Mwanainchi" },
      { property: "og:description", content: "Nyama choma, burgers, grilled kienyeji chicken and family platters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Kitchen,
});

function Kitchen() {
  const { products, settings } = useCatalog();
  const { category } = Route.useSearch();
  const navigate = Route.useNavigate();
  const hours = settings ? `${settings.kitchen_open.slice(0, 5)} – ${settings.kitchen_close.slice(0, 5)}` : "";
  return (
    <CatalogPage eyebrow="Our Kitchen" title="Cooked to order" categories={KITCHEN_CATEGORIES}
      intro="Choose your meal, add sides and extras, then pick delivery, collection or a scheduled time at checkout."
      products={products.filter((p) => p.section === "kitchen")} active={category}
      onCategory={(c) => navigate({ search: { category: c } })}>
      {hours && (
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-leaf/15 px-4 py-2 text-sm font-medium text-leaf">
          <Clock className="h-4 w-4" /> Kitchen open daily {hours}{settings?.scheduled_enabled ? " · Scheduled orders welcome" : ""}
        </div>
      )}
      <MealAdvisor products={products.filter((p) => p.section === "kitchen")} />
    </CatalogPage>
  );
}
