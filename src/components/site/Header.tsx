import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/butchery", label: "Butchery" },
  { to: "/kitchen", label: "Our Kitchen" },
  { to: "/shop", label: "Shop All" },
  { to: "/about", label: "About Mwanainchi" },
  { to: "/contact", label: "Contact" },
] as const;

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className="flex flex-col leading-none">
      <span className={`font-display text-2xl font-bold tracking-tight ${light ? "text-charcoal-foreground" : ""}`}>
        MWANA<span className="text-primary">INCHI</span>
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-leaf">Butchery · Kitchen</span>
    </Link>
  );
}

export function Header({ announcement }: { announcement?: string | undefined }) {
  const { count } = useCart();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/shop", search: { q: q.trim() || undefined, category: undefined } });
    setSearchOpen(false);
    setMenu(false);
  };
  return (
    <header className="sticky top-0 z-40">
      {announcement && <div className="bg-charcoal px-4 py-2 text-center text-xs font-medium text-charcoal-foreground">{announcement}</div>}
      <div className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav className="hidden items-center gap-6 lg:flex">
            {NAV.slice(1).map((n) => (
              <Link key={n.to} to={n.to} className="text-sm font-medium text-foreground/80 hover:text-primary" activeProps={{ className: "text-primary" }}>{n.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <button aria-label="Search" onClick={() => setSearchOpen((s) => !s)} className="rounded-full p-2 hover:bg-muted"><Search className="h-5 w-5" /></button>
            <Link to="/account" aria-label="My Account" className="rounded-full p-2 hover:bg-muted"><User className="h-5 w-5" /></Link>
            <Link to="/cart" aria-label="Shopping cart" className="relative rounded-full bg-charcoal p-2 text-charcoal-foreground">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">{count}</span>}
            </Link>
            <Sheet open={menu} onOpenChange={setMenu}>
              <SheetTrigger asChild><button aria-label="Menu" className="rounded-full p-2 hover:bg-muted lg:hidden"><Menu className="h-5 w-5" /></button></SheetTrigger>
              <SheetContent className="bg-background">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="mt-8 flex flex-col gap-1">
                  {NAV.map((n) => <Link key={n.to} to={n.to} onClick={() => setMenu(false)} className="rounded-lg px-3 py-3 font-display text-xl hover:bg-muted">{n.label}</Link>)}
                  <Link to="/account" onClick={() => setMenu(false)} className="rounded-lg px-3 py-3 font-display text-xl hover:bg-muted">My Account</Link>
                  <Link to="/cart" onClick={() => setMenu(false)} className="rounded-lg px-3 py-3 font-display text-xl hover:bg-muted">Shopping Cart ({count})</Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        {searchOpen && (
          <form onSubmit={submit} className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search beef, choma, burgers…" className="flex-1 bg-transparent py-2 outline-none" />
            <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}><X className="h-4 w-4" /></button>
          </form>
        )}
      </div>
    </header>
  );
}
