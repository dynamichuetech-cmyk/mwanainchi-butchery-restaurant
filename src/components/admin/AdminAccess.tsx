import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = { user_id: string; email: string; full_name: string | null; role: string; assigned_at: string };

export function AdminAccess() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [busy, setBusy] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-access"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_admins");
      if (error) throw new Error("Unable to load administrators");
      return data as Row[];
    },
  });

  async function change(target: string, r: string, grant: boolean) {
    setBusy(true);
    const { error } = await supabase.rpc("set_admin_role", { _email: target, _role: r, _grant: grant });
    setBusy(false);
    if (error) {
      const known = /(No account|Email verification|cannot remove|At least one|Access denied)/.exec(error.message);
      toast.error(known ? error.message : "Unable to update access");
      return;
    }
    toast.success(grant ? "Access granted" : "Access removed");
    if (grant) setEmail("");
    await qc.invalidateQueries({ queryKey: ["admin-access"] });
  }

  return (
    <div className="mt-6 space-y-6">
      <form className="rounded-2xl border bg-card p-5" onSubmit={(e) => { e.preventDefault(); if (email.trim()) void change(email, role, true); }}>
        <h2 className="text-xl font-bold">Add an administrator</h2>
        <p className="mt-1 text-sm text-muted-foreground">The person must first create an account at the sign-in page and confirm their email.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input type="email" required placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value as "admin" | "super_admin")}>
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
          </select>
          <Button disabled={busy}>Grant access</Button>
        </div>
      </form>
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-bold">Current administrators</h2>
        {isLoading && <p className="mt-3 text-sm">Loading…</p>}
        {error && <p className="mt-3 text-sm text-destructive">{(error as Error).message}</p>}
        <ul className="mt-3 divide-y">
          {data?.map((a) => (
            <li key={a.user_id + a.role} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div><p className="font-medium">{a.full_name || a.email}</p><p className="text-sm text-muted-foreground">{a.email} · {a.role === "super_admin" ? "Super admin" : "Admin"}</p></div>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void change(a.email, a.role, false)}>Remove</Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
