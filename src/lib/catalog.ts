import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCatalog } from "./catalog.functions";
import type { Database } from "@/integrations/supabase/types";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type DeliveryZone = Database["public"]["Tables"]["delivery_zones"]["Row"];
export type Addon = { name: string; price: number };

export const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
  staleTime: 60_000,
});
export const useCatalog = () => useSuspenseQuery(catalogQuery).data;
export const addonsOf = (p: Product) => (Array.isArray(p.customisations) ? (p.customisations as unknown as Addon[]) : []);
export const effectivePrice = (p: Product) => Number(p.promo_price ?? p.price);

export const BUTCHERY_CATEGORIES = ["Beef", "Goat & Lamb", "Pork", "Kienyeji Chicken", "Fish"];
export const KITCHEN_CATEGORIES = ["Nyama Choma", "Grilled Chicken", "Burgers", "Chips", "Food Platters", "Drinks", "Other Meals"];
