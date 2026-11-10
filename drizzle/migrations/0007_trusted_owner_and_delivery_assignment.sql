CREATE OR REPLACE FUNCTION public.grant_owner_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF new.id='fb09fe26-f6d9-479d-9ee1-9364b3506c8c'::uuid AND new.email_confirmed_at IS NOT NULL THEN INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'admin') ON CONFLICT DO NOTHING; END IF; RETURN new; END $$;
CREATE OR REPLACE FUNCTION public.assign_delivery(_order uuid,_rider uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.rider_profiles r JOIN auth.users u ON u.id=r.user_id WHERE r.user_id=_rider AND r.approval_status='approved' AND u.email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Approved rider required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.orders WHERE id=_order AND fulfilment='delivery' AND status='ready') THEN RAISE EXCEPTION 'Delivery order must be ready'; END IF;
 INSERT INTO public.delivery_assignments(order_id,rider_id) VALUES(_order,_rider) ON CONFLICT(order_id) DO UPDATE SET rider_id=excluded.rider_id WHERE delivery_assignments.status='assigned';
 END $$;
REVOKE ALL ON FUNCTION public.assign_delivery(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.assign_delivery(uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.my_delivery_details() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'order_number',o.order_number,'status',a.status,'contact_name',o.contact_name,'contact_phone',o.contact_phone,'address',o.address,'notes',o.delivery_notes)), '[]'::jsonb) FROM public.delivery_assignments a JOIN public.orders o ON o.id=a.order_id WHERE a.rider_id=auth.uid() AND public.has_role(auth.uid(),'rider') AND EXISTS(SELECT 1 FROM public.rider_profiles WHERE user_id=auth.uid() AND approval_status='approved')
$$;
REVOKE ALL ON FUNCTION public.my_delivery_details() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_delivery_details() TO authenticated;