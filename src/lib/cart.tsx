import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { lineTotal } from "./pricing";

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  imageKey: string;
  section: string;
  unit: string;
  sellType: string;
  step: number;
  minQty: number;
  qty: number;
  unitPrice: number;
  prep?: string | undefined;
  addons: string[];
  notes?: string | undefined;
};

type Ctx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (i: Omit<CartItem, "key">) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  discountCode: string;
  setDiscountCode: (c: string) => void;
};

const CartContext = createContext<Ctx | null>(null);
const STORAGE = "mwanainchi-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discountCode, setDiscountCode] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE, JSON.stringify(items));
  }, [items, loaded]);

  const value = useMemo<Ctx>(() => {
    return {
      items,
      count: items.length,
      subtotal: items.reduce((s, i) => s + lineTotal(i.unitPrice, i.qty), 0),
      add: (i) =>
        setItems((prev) => {
          const key = `${i.productId}|${i.prep ?? ""}|${[...i.addons].sort().join(",")}|${i.notes ?? ""}`;
          const existing = prev.find((p) => p.key === key);
          if (existing) return prev.map((p) => (p.key === key ? { ...p, qty: +(p.qty + i.qty).toFixed(3) } : p));
          return [...prev, { ...i, key }];
        }),
      setQty: (key, qty) =>
        setItems((prev) => prev.map((p) => (p.key === key ? { ...p, qty: Math.max(p.minQty, +qty.toFixed(3)) } : p))),
      remove: (key) => setItems((prev) => prev.filter((p) => p.key !== key)),
      clear: () => {
        setItems([]);
        setDiscountCode("");
      },
      discountCode,
      setDiscountCode,
    };
  }, [items, discountCode]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
