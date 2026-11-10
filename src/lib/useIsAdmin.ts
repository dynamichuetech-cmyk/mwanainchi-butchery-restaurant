import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin(userId: string) {
  return useQuery({
    queryKey: ["is-admin", userId],
    queryFn: async () => (await supabase.rpc("has_role", { _user_id: userId, _role: "admin" })).data === true,
  });
}

