import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

import { authError } from "@/lib/auth-rules";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password | Mwanainchi" },
      { name: "description", content: "Choose a new password for your Mwanainchi account." },
      { property: "og:title", content: "Set a new password | Mwanainchi" },
      { property: "og:description", content: "Choose a new password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const { session } = useAuth();
  useEffect(() => { const valid = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery"; if (valid) sessionStorage.setItem("mw-password-recovery", "true"); setRecovery(valid || sessionStorage.getItem("mw-password-recovery") === "true"); }, []);
  const navigate = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recovery || !session) { toast.error("Open a valid password reset link from your email."); return; }
    if (pw !== confirmation) { toast.error("Passwords do not match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(authError(error)); return; }
    sessionStorage.removeItem("mw-password-recovery");
    toast.success("Password updated");
    navigate({ to: "/account" });
  };
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-4xl font-bold">Set a new password</h1>
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl bg-card p-8 shadow-warm">
        {!recovery && <p role="alert" className="text-sm text-destructive">Open the password reset link sent to your email.</p>}
        <Input required type="password" minLength={8} placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Input required type="password" placeholder="Confirm password" aria-label="Confirm password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
        <Button disabled={busy || !recovery || !session} className="w-full rounded-full font-bold">{busy ? "Updating…" : "Update password"}</Button>
      </form>
    </div>
  );
}
