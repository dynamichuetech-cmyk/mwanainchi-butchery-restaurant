export type EarningRow = { status: string; delivery_fee: number; updated_at: string };
/** Rider earns the order's delivery fee for each delivered order. Week starts Monday. */
export function riderEarnings(rows: EarningRow[], now: Date) {
  const day = new Date(now); day.setHours(0, 0, 0, 0);
  const week = new Date(day); week.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  const done = rows.filter((r) => r.status === "delivered");
  const sum = (xs: EarningRow[]) => xs.reduce((s, r) => s + Number(r.delivery_fee), 0);
  const t = done.filter((r) => new Date(r.updated_at) >= day);
  const w = done.filter((r) => new Date(r.updated_at) >= week);
  return { today: sum(t), todayCount: t.length, week: sum(w), weekCount: w.length, total: sum(done) };
}
