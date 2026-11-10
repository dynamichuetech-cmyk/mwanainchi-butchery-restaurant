import { Link } from "@tanstack/react-router";
import { Logo } from "./Header";

export function Footer() {
  return (
    <footer className="bg-charcoal text-charcoal-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 grid-cols-2 md:grid-cols-4 md:py-16">
        <div className="col-span-2 space-y-4 md:col-span-1">
          <Logo light size="lg" />
          <p className="text-sm text-charcoal-foreground/70">Freshness You Can Taste. Quality You Can Trust.</p>
        </div>
        <div>
          <h4 className="mb-3 font-display text-lg">Shop</h4>
          <ul className="space-y-2 text-sm text-charcoal-foreground/70">
            <li><Link to="/butchery">Butchery</Link></li>
            <li><Link to="/kitchen">Our Kitchen</Link></li>
            <li><Link to="/shop" search={{ q: undefined, category: "Drinks" }}>Drinks</Link></li>
            <li><Link to="/shop" search={{ q: undefined, category: undefined }}>Shop All</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-display text-lg">Account</h4>
          <ul className="space-y-2 text-sm text-charcoal-foreground/70">
            <li><Link to="/account">My Account</Link></li>
            <li><Link to="/account">Track an Order</Link></li>
            <li><Link to="/cart">Shopping Cart</Link></li>
            <li><Link to="/about">About Mwanainchi</Link></li>
          </ul>
        </div>
        <div className="col-span-2 md:col-span-1">
          <h4 className="mb-3 font-display text-lg">We deliver to</h4>
          <p className="text-sm text-charcoal-foreground/70">Utawala · Kasarani · Riruta · Embakasi East</p>
          <p className="mt-4 text-sm text-charcoal-foreground/70"><Link to="/contact" className="underline">Contact us</Link></p>
          <p className="mt-2 text-sm text-charcoal-foreground/70">Pay with M-Pesa, card or cash on delivery.</p>
        </div>
      </div>
      <div className="border-t border-charcoal-foreground/10 py-6 pb-24 lg:pb-6 text-center text-xs text-charcoal-foreground/50">© {new Date().getFullYear()} Mwanainchi. All rights reserved.</div>
    </footer>
  );
}
