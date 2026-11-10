export const STATUS_LABEL: Record<string, string> = {
  placed: "Order placed", confirmed: "Confirmed", preparing: "Being prepared", ready: "Ready",
  out_for_delivery: "On the way", delivered: "Delivered", collected: "Collected", cancelled: "Cancelled",
};
export const PAYMENT_LABEL: Record<string, string> = {
  pending: "Pay on delivery/collection", awaiting_payment: "Awaiting payment", paid: "Paid",
  failed: "Payment failed", cancelled: "Payment cancelled", refunded: "Refunded",
};
export const timeline = (fulfilment: string) =>
  fulfilment === "delivery"
    ? ["placed", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"]
    : ["placed", "confirmed", "preparing", "ready", "collected"];
