import { describe, expect, it } from "vitest";
import { deliveryFee, formatQty, lineTotal } from "./pricing";

describe("pricing", () => {
  it("1.5 kg of beef at KES 750/kg costs KES 1,125", () => {
    expect(lineTotal(750, 1.5)).toBe(1125);
  });
  it("shows grams below 1 kg", () => {
    expect(formatQty(0.25, "kg")).toBe("250 g");
  });
  it("delivery is free once the free-delivery threshold is reached", () => {
    expect(deliveryFee({ fee: 200, min_order: 1000, free_threshold: 5000 }, 5000)).toBe(0);
    expect(deliveryFee({ fee: 200, min_order: 1000, free_threshold: 5000 }, 4999)).toBe(200);
  });
});
