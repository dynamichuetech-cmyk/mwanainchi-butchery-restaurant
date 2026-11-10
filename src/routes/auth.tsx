import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const safe = (r?: string) => (r && r.startsWith("/") && !r.startsWith("//") ? r : "/account");

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({ redirect: typeof s["redirect"] === "string" ? (s["redirect"] as string) : undefined }),
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
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const target = safe(redirect);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Check your email for a reset link.");
        setMode("in");
      } else if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email: f.email, password: f.password,
          options: { emailRedirectTo: `${window.location.origin}${target}`, data: { full_name: f.name } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: target });
        else toast.success("Almost there! Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) throw error;
        navigate({ to: target });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    sessionStorage.setItem("mw-after-auth", target);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth?redirect=" + encodeURIComponent(target) });
    if (r.error) { toast.error("Google sign-in failed"); return; }
    if (r.redirected) return;
    navigate({ to: target });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-4xl font-bold">{mode === "up" ? "Create your account" : mode === "forgot" ? "Reset password" : "Welcome back"}</h1>
      <p className="mt-2 text-muted-foreground">Track orders, save addresses and reorder in one tap.</p>
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl bg-card p-8 shadow-warm">
        {mode === "up" && <Input required placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
        <Input required type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        {mode !== "forgot" && <Input required type="password" minLength={6} placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />}
        <Button disabled={busy} className="w-full rounded-full font-bold">{mode === "up" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</Button>
        {mode !== "forgot" && (
          <button type="button" onClick={google}
            className="flex w-full items-center justify-center gap-[10px] rounded-full border border-[#747775] bg-[#FFFFFF] px-3 py-2.5 text-sm font-medium text-[#1F1F1F]">
            <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.560-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.070 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.090z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
            Continue with Google
          </button>
        )}
        <div className="flex justify-between text-sm">
          <button type="button" className="text-primary" onClick={() => setMode(mode === "up" ? "in" : "up")}>{mode === "up" ? "I have an account" : "Create an account"}</button>
          {mode === "in" && <button type="button" className="text-muted-foreground" onClick={() => setMode("forgot")}>Forgot password?</button>}
          {mode === "forgot" && <button type="button" className="text-muted-foreground" onClick={() => setMode("in")}>Back to sign in</button>}
        </div>
      </form>
    </div>
  );
}
