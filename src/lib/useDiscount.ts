import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDiscount(code: string, subtotal: number) {
  const { data } = useQuery({
    queryKey: ["discount", code, subtotal],
    enabled: !!code && subtotal > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("check_discount", { _code: code, _subtotal: subtotal });
      if (error) return 0;
      return Number(data ?? 0);
    },
  });
  return code ? (data ?? 0) : 0;
}
