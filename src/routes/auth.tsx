import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { safeDestination, loginDestination, adminRole, authError, validateRegistration, type Role } from "@/lib/auth-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";


export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined; admin?: boolean | undefined } => ({ redirect: typeof s["redirect"] === "string" ? safeDestination(s["redirect"]) : undefined, admin: s["admin"] === true || s["admin"] === "true" ? true : undefined }),
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
  const admin = search.admin === true || search.redirect?.startsWith("/admin");
  const intended = safeDestination(search.redirect) ?? savedTarget;
  const finish = async (role: Role | null) => {
    if (admin && !adminRole(role)) { setFailed(true); setFeedback("This account is not authorised for administration. Your customer session remains signed in."); return; }
    sessionStorage.removeItem("mw-after-auth");
    await navigate({ to: loginDestination(role, intended), replace: true });
  };
  useEffect(() => {
    if (auth.isAuthenticated && !busy && !feedback) void finish(auth.role);
  }, [auth.isAuthenticated, auth.role, savedTarget, search.admin, search.redirect]);
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
        const result = await auth.register(f);
        if (result.pendingVerification) setFeedback("Account created. Check your email and confirm your address before signing in.");
        else if (result.identity) await finish(result.identity.role);
      } else {
        const identity = await auth.login(f.email, f.password);
        await finish(identity.role);
      }
    } catch (error) { setFailed(true); setFeedback(authError(error)); }
    finally { setBusy(false); }
  };
  const google = async () => {
    setBusy(true); setFeedback("");
    try {
      sessionStorage.setItem("mw-after-auth", intended ?? (admin ? "/admin" : "/account"));
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
      if (result.error) throw result.error;
      if (!result.redirected) { const identity = await auth.refreshProfile(); if (identity.user) await finish(identity.role); }
    } catch (error) { setFailed(true); setFeedback(authError(error)); }
    finally { setBusy(false); }
  };
  const changeMode = (next: typeof mode) => { setMode(next); setFeedback(""); setFailed(false); };
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-20">
      <h1 className="text-4xl font-bold">{admin ? "Administrator sign in" : mode === "up" ? "Create your account" : mode === "forgot" ? "Reset password" : "Welcome back"}</h1>
      {auth.isLoading && <p role="status" className="mt-3 text-muted-foreground">Checking your account…</p>}
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl bg-card p-5 shadow-warm sm:p-8">
        {mode === "up" && <><label className="block text-sm">Full name<Input required autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label><label className="block text-sm">Phone number<Input required type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label></>}
        <label className="block text-sm">Email<Input required type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        {mode !== "forgot" && <><label className="block text-sm">Password<div className="relative"><Input required type={visible ? "text" : "password"} minLength={mode === "up" ? 8 : undefined} autoComplete={mode === "up" ? "new-password" : "current-password"} className="pr-12" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><Button type="button" variant="ghost" size="icon" aria-label={visible ? "Hide password" : "Show password"} title={visible ? "Hide password" : "Show password"} className="absolute right-0 top-0" onClick={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</Button></div></label>{mode === "up" && <label className="block text-sm">Confirm password<Input required type={visible ? "text" : "password"} autoComplete="new-password" value={f.confirmation} onChange={(e) => setF({ ...f, confirmation: e.target.value })} /></label>}</>}
        {feedback && <p role={failed ? "alert" : "status"} className={failed ? "text-sm text-destructive" : "text-sm text-leaf"}>{feedback}</p>}
        {auth.error && <p role="alert" className="text-sm text-destructive">{auth.error}</p>}
        <Button disabled={busy || auth.isLoading} className="w-full rounded-full font-bold">{busy ? "Please wait…" : mode === "up" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</Button>
        {mode !== "forgot" && <Button type="button" variant="outline" disabled={busy || auth.isLoading} onClick={google} className="w-full rounded-full">Continue with Google</Button>}
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          {!admin && <Button type="button" variant="link" className="px-0" onClick={() => changeMode(mode === "up" ? "in" : "up")}>{mode === "up" ? "I have an account" : "Create an account"}</Button>}
          {mode === "in" && <Button type="button" variant="link" className="px-0" onClick={() => changeMode("forgot")}>Forgot password?</Button>}
          {mode === "forgot" && <Button type="button" variant="link" className="px-0" onClick={() => changeMode("in")}>Back to sign in</Button>}
        </div>
        {admin && <Button asChild variant="link" className="px-0"><Link to={auth.isAuthenticated ? "/account" : "/auth"} search={{ admin: undefined, redirect: undefined }}>Customer account</Link></Button>}
        {!admin && <Button asChild variant="link" className="px-0"><Link to="/auth" search={{ admin: true, redirect: "/admin" }}>Administrator sign in</Link></Button>}
      </form>
    </div>
  );
}
