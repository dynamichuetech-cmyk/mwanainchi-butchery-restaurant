import { describe, expect, it } from "vitest";
import { riderEarnings } from "./rider-earnings";
const now = new Date("2026-11-11T12:00:00"); // Wednesday
describe("riderEarnings", () => {
  it("counts only delivered orders' delivery fees", () => {
    const r = riderEarnings([{ status: "delivered", delivery_fee: 200, updated_at: "2026-11-11T09:00:00" }, { status: "out_for_delivery", delivery_fee: 300, updated_at: "2026-11-11T10:00:00" }], now);
    expect(r.today).toBe(200); expect(r.total).toBe(200);
  });
  it("week starts Monday", () => {
    const r = riderEarnings([{ status: "delivered", delivery_fee: 150, updated_at: "2026-11-09T09:00:00" }, { status: "delivered", delivery_fee: 100, updated_at: "2026-11-08T09:00:00" }], now);
    expect(r.week).toBe(150); expect(r.total).toBe(250); expect(r.today).toBe(0);
  });
});
