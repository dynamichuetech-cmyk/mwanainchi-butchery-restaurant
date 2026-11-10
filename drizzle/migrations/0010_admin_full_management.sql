CREATE OR REPLACE FUNCTION public.assign_delivery(_order uuid,_rider uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.rider_profiles r JOIN auth.users u ON u.id=r.user_id WHERE r.user_id=_rider AND r.approval_status='approved' AND u.email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Approved rider required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.orders WHERE id=_order AND fulfilment='delivery' AND status IN ('placed','confirmed','preparing','ready')) THEN RAISE EXCEPTION 'Order is not open for rider assignment'; END IF;
 INSERT INTO public.delivery_assignments(order_id,rider_id) VALUES(_order,_rider) ON CONFLICT(order_id) DO UPDATE SET rider_id=excluded.rider_id, updated_at=now() WHERE delivery_assignments.status='assigned';
END $$;
REVOKE ALL ON FUNCTION public.assign_delivery(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.assign_delivery(uuid,uuid) TO authenticated;

CREATE POLICY "admin read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;
CREATE POLICY "admin manage discounts" ON public.discount_codes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

GRANT UPDATE ON public.store_settings TO authenticated;
CREATE POLICY "admin update settings" ON public.store_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));