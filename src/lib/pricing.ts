export const formatKES = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

/** Line total in KES, rounded to the shilling (same rule as the backend). */
export function lineTotal(unitPrice: number, qty: number) {
  return Math.round(unitPrice * qty);
}

export function formatQty(qty: number, unit: string) {
  if (unit === "kg") return qty < 1 ? `${Math.round(qty * 1000)} g` : `${qty} kg`;
  const plural = qty === 1 ? unit : `${unit}s`;
  return `${qty} ${plural}`;
}

export type Zone = { fee: number; min_order: number; free_threshold: number | null };
export function deliveryFee(zone: Zone | null | undefined, afterDiscount: number) {
  if (!zone) return 0;
  if (zone.free_threshold != null && afterDiscount >= zone.free_threshold) return 0;
  return zone.fee;
}
