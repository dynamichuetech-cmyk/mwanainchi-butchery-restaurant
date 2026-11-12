import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, EyeOff, ShoppingBag, Bike } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { safeDestination, loginDestination, riderDestination, authError, validateRegistration, type Role, type RiderStatus } from "@/lib/auth-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import foodPhoto from "@/assets/platter.jpg";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { applyAsRider } from "@/lib/auth.functions";
import { lovable } from "@/integrations/lovable/index";


export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined; kind?: "customer" | "rider" | undefined } => ({ redirect: typeof s["redirect"] === "string" ? safeDestination(s["redirect"]) : undefined, kind: s["kind"] === "rider" || (typeof s["redirect"] === "string" && s["redirect"].startsWith('/rider')) ? "rider" : "customer" }),
  head: () => ({
    meta: [
      { title: "Sign in | Mwanainchi" },
      { name: "description", content: "Sign in or create your Mwanainchi account." },
      { property: "og:title", content: "Sign in | Mwanainchi" },
      { property: "og:description", content: "Access your orders, addresses and tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const auth = useAuth();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", confirmation: "" });
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [savedTarget, setSavedTarget] = useState<string | undefined>();
  useEffect(() => { setSavedTarget(safeDestination(sessionStorage.getItem("mw-after-auth") ?? undefined)); }, []);
  const kind = search.kind ?? "customer";
  const intended = safeDestination(search.redirect) ?? savedTarget;
  const finish = async (role: Role | null, status: RiderStatus | null = auth.riderStatus) => {
    if (role !== 'customer' && role !== 'rider') { setFailed(true); setFeedback("This account cannot access the public account portal."); return; }
    if (kind === 'rider' && role !== 'rider') { setFailed(true); setFeedback("This is a customer account. Choose Customer, or submit a rider application."); return; }
    sessionStorage.removeItem("mw-after-auth");
    await navigate({ to: role === "rider" ? riderDestination(status) : loginDestination(role, intended), replace: true });
  };
  useEffect(() => {
    if (search.redirect?.startsWith('/admin')) { void navigate({to:'/admin',replace:true}); return; }
    if (auth.isAuthenticated && !busy && !feedback) void finish(auth.role, auth.riderStatus);
  }, [auth.isAuthenticated, auth.role, savedTarget, kind, search.redirect, auth.riderStatus]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setFeedback(""); setFailed(false);
    if (mode === "up") {
      const invalid = validateRegistration(f);
      if (invalid) { setFailed(true); setFeedback(invalid); return; }
    }
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setFeedback("Check your email for a password reset link.");
      } else if (mode === "up") {
        sessionStorage.setItem("mw-after-auth", intended ?? "/account");
        const result = await auth.register({ ...f, kind });
        if (result.pendingVerification) setFeedback(kind === "rider" ? "Application submitted. Confirm your email, then sign in to check approval status. Deliveries remain unavailable until approval." : "Account created. Check your email and confirm your address before signing in.");
        else if (result.identity) await finish(result.identity.role, result.identity.riderStatus);
      } else {
        const identity = await auth.login(f.email, f.password);
        await finish(identity.role, identity.riderStatus);
      }
    } catch (error) { setFailed(true); setFeedback(authError(error)); }
    finally { setBusy(false); }
  };
  const google = async () => {
    setBusy(true); setFeedback("");
    try {
      sessionStorage.setItem("mw-after-auth", kind === "rider" ? "/rider/status" : intended ?? "/account");
      const redirect = window.location.origin + "/auth?kind=" + kind;
      // Lovable's sign-in relay only exists on Lovable hosting; elsewhere (e.g. Vercel) use the database's own Google provider.
      if (!/\.lovable(project)?\.(app|com)$/.test(window.location.hostname)) {
        const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect } });
        if (error) throw error;
        return;
      }
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirect });
      if (result.error) throw result.error;
      if (!result.redirected) { const identity = await auth.refreshProfile(); if (identity.user) await finish(identity.role, identity.riderStatus); }
    } catch (error) { setFailed(true); setFeedback(authError(error)); }
    finally { setBusy(false); }
  };
  const changeMode = (next: typeof mode) => { setMode(next); setFeedback(""); setFailed(false); };
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="relative mb-8 h-40 overflow-hidden rounded-lg sm:h-52"><img src={foodPhoto} alt="Mwanainchi freshly prepared meal platter" className="h-full w-full object-cover" /><div className="absolute inset-x-0 bottom-0 bg-charcoal/85 px-6 py-4 text-charcoal-foreground"><p className="font-display text-2xl font-bold">Mwanainchi</p><p className="text-sm">Freshness You Can Taste. Quality You Can Trust.</p></div></div>
      <div className="mx-auto max-w-md">
      <Tabs value={kind} onValueChange={(value) => { setFeedback(""); setFailed(false); void navigate({to:"/auth",search:{kind:value === "rider" ? "rider" : "customer",redirect:search.redirect}}); }}><TabsList className="grid h-12 w-full grid-cols-2"><TabsTrigger value="customer" className="gap-2"><ShoppingBag className="h-4 w-4"/>Customer</TabsTrigger><TabsTrigger value="rider" className="gap-2"><Bike className="h-4 w-4"/>Delivery Rider</TabsTrigger></TabsList></Tabs>
      <h1 className="mt-6 text-3xl font-bold">{mode === "up" ? kind === "rider" ? "Apply to ride with us" : "Create your account" : mode === "forgot" ? "Reset password" : kind === "rider" ? "Rider sign in" : "Welcome back"}</h1>
      {auth.isLoading && <p role="status" className="mt-3 text-muted-foreground">Checking your account…</p>}
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl bg-card p-5 shadow-warm sm:p-8">
        {mode === "up" && <><label className="block text-sm">Full name<Input required autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label><label className="block text-sm">Phone number<Input required type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label></>}
        <label className="block text-sm">Email<Input required type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        {mode !== "forgot" && <><label className="block text-sm">Password<div className="relative"><Input required type={visible ? "text" : "password"} minLength={mode === "up" ? 8 : undefined} autoComplete={mode === "up" ? "new-password" : "current-password"} className="pr-12" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><Button type="button" variant="ghost" size="icon" aria-label={visible ? "Hide password" : "Show password"} title={visible ? "Hide password" : "Show password"} className="absolute right-0 top-0" onClick={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</Button></div></label>{mode === "up" && <label className="block text-sm">Confirm password<Input required type={visible ? "text" : "password"} autoComplete="new-password" value={f.confirmation} onChange={(e) => setF({ ...f, confirmation: e.target.value })} /></label>}</>}
        {feedback && <p role={failed ? "alert" : "status"} className={failed ? "text-sm text-destructive" : "text-sm text-leaf"}>{feedback}</p>}
        {auth.error && <p role="alert" className="text-sm text-destructive">{auth.error}</p>}
        <Button disabled={busy || auth.isLoading} className="w-full rounded-full font-bold">{busy ? "Please wait…" : mode === "up" ? kind === "rider" ? "Submit application" : "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</Button>
        {mode !== "forgot" && <Button type="button" variant="outline" disabled={busy || auth.isLoading} onClick={google} className="w-full rounded-full">Continue with Google</Button>}
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          {<Button type="button" variant="link" className="px-0" onClick={() => changeMode(mode === "up" ? "in" : "up")}>{mode === "up" ? "I have an account" : "Create an account"}</Button>}
          {mode === "in" && <Button type="button" variant="link" className="px-0" onClick={() => changeMode("forgot")}>Forgot password?</Button>}
          {mode === "forgot" && <Button type="button" variant="link" className="px-0" onClick={() => changeMode("in")}>Back to sign in</Button>}
        </div>
        {kind === "rider" && auth.role === "customer" && <Button type="button" variant="outline" disabled={busy} className="w-full" onClick={async () => { setBusy(true); try { await applyAsRider(); const identity=await auth.refreshProfile(); await finish(identity.role,identity.riderStatus); } catch(error) {setFailed(true);setFeedback(authError(error));} finally {setBusy(false);} }}>Submit rider application</Button>}
      </form>
      </div>
    </div>
  );
}
