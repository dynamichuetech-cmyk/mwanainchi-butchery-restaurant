import { Link, useLocation } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatKES } from "@/lib/pricing";

export function MobileCartBar() {
  const { count, subtotal } = useCart();
  const { pathname } = useLocation();
  if (!count || pathname.startsWith("/cart") || pathname.startsWith("/checkout") || pathname.startsWith("/admin")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <Link to="/cart" className="flex items-center justify-between rounded-full bg-charcoal px-5 py-3.5 text-charcoal-foreground shadow-warm">
        <span className="flex items-center gap-2 font-semibold"><ShoppingBag className="h-5 w-5 text-primary" /> View cart ({count})</span>
        <span className="font-bold">{formatKES(subtotal)}</span>
      </Link>
    </div>
  );
}
