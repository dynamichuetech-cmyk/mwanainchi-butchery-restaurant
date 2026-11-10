import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

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
  const navigate = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate({ to: "/account" });
  };
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-4xl font-bold">Set a new password</h1>
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl bg-card p-8 shadow-warm">
        <Input required type="password" minLength={6} placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button className="w-full rounded-full font-bold">Update password</Button>
      </form>
    </div>
  );
}
