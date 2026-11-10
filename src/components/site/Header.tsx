import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import logo from "@/assets/mwanainchi-logo.png.asset.json";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/butchery", label: "Butchery" },
  { to: "/kitchen", label: "Our Kitchen" },
  { to: "/shop", label: "Shop All" },
  { to: "/about", label: "About Mwanainchi" },
  { to: "/contact", label: "Contact" },
] as const;

export function Logo({ light, size = "md" }: { light?: boolean; size?: "md" | "lg" }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2" aria-label="Mwanainchi home">
      <img src={logo.url} alt="Mwanainchi Butchery logo" className={`${size === "lg" ? "h-20 w-20" : "h-11 w-11 sm:h-12 sm:w-12"} shrink-0 rounded-full`} />
      <span className={`hidden font-display text-xl font-bold tracking-tight sm:inline ${light ? "text-charcoal-foreground" : ""}`}>
        MWANA<span className="text-primary">INCHI</span>
      </span>
    </Link>
  );
}

export function Header({ announcement }: { announcement?: string | undefined }) {
  const { count } = useCart();
  const auth = useAuth();
  const accountTo = auth.isRider ? "/rider" : auth.isAuthenticated ? "/account" : "/auth";
  const accountLabel = auth.isLoading ? "Checking account…" : auth.isRider ? "Rider account" : auth.isAuthenticated ? "My Account" : "Sign in";
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
      {announcement && <div className="truncate bg-charcoal px-4 py-1.5 text-center text-[11px] font-medium text-charcoal-foreground sm:py-2 sm:text-xs">{announcement}</div>}
      <div className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4">
          <Logo />
          <nav className="hidden items-center gap-6 lg:flex">
            {NAV.slice(1).map((n) => (
              <Link key={n.to} to={n.to} className="text-sm font-medium text-foreground/80 hover:text-primary" activeProps={{ className: "text-primary" }}>{n.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <button aria-label="Search" onClick={() => setSearchOpen((s) => !s)} className="rounded-full p-2 hover:bg-muted"><Search className="h-5 w-5" /></button>
            <Button asChild variant="ghost" size="sm" disabled={auth.isLoading}><Link to={accountTo} aria-label={accountLabel}><User className="h-5 w-5" /><span className="hidden sm:inline">{accountLabel}</span></Link></Button>
            <Link to="/cart" aria-label="Shopping cart" className="relative rounded-full bg-charcoal p-2 text-charcoal-foreground">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">{count}</span>}
            </Link>
            <Sheet open={menu} onOpenChange={setMenu}>
              <SheetTrigger asChild><button aria-label="Menu" className="rounded-full p-2 hover:bg-muted lg:hidden"><Menu className="h-5 w-5" /></button></SheetTrigger>
              <SheetContent className="w-[85vw] max-w-sm bg-background">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Logo size="lg" />
                <div className="mt-6 flex flex-col gap-1">
                  {NAV.map((n) => <Link key={n.to} to={n.to} onClick={() => setMenu(false)} className="rounded-lg px-3 py-3 font-display text-xl hover:bg-muted">{n.label}</Link>)}
                  <Link to={accountTo} onClick={() => setMenu(false)} className="rounded-lg px-3 py-3 font-display text-xl hover:bg-muted">{accountLabel}</Link>
                  {auth.isAuthenticated && <Button variant="ghost" className="justify-start" onClick={() => { setMenu(false); void auth.logout(); }}>Sign out</Button>}
                  <Link to="/cart" onClick={() => setMenu(false)} className="rounded-lg px-3 py-3 font-display text-xl hover:bg-muted">Shopping Cart ({count})</Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        {searchOpen && (
          <form onSubmit={submit} className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input autoFocus value={q} type="search" onChange={(e) => setQ(e.target.value)} placeholder="Search beef, choma, burgers…" className="flex-1 bg-transparent py-2 outline-none" />
            <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}><X className="h-4 w-4" /></button>
          </form>
        )}
      </div>
    </header>
  );
}
