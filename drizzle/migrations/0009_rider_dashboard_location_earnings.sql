CREATE OR REPLACE FUNCTION public.my_delivery_details() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'order_number',o.order_number,'status',a.status,'contact_name',o.contact_name,'contact_phone',o.contact_phone,'address',o.address,'notes',o.delivery_notes,'zone',z.name,'total',o.total,'delivery_fee',o.delivery_fee,'payment_method',o.payment_method,'payment_status',o.payment_status,'latitude',a.latitude,'longitude',a.longitude,'updated_at',a.updated_at) ORDER BY a.updated_at DESC), '[]'::jsonb)
 FROM public.delivery_assignments a JOIN public.orders o ON o.id=a.order_id LEFT JOIN public.delivery_zones z ON z.id=o.zone_id
 WHERE a.rider_id=auth.uid() AND public.has_role(auth.uid(),'rider') AND EXISTS(SELECT 1 FROM public.rider_profiles WHERE user_id=auth.uid() AND approval_status='approved')
$$;
REVOKE ALL ON FUNCTION public.my_delivery_details() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_delivery_details() TO authenticated;

CREATE OR REPLACE FUNCTION public.update_my_location(_id uuid,_latitude numeric,_longitude numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.has_role(auth.uid(),'rider') OR NOT EXISTS(SELECT 1 FROM public.rider_profiles WHERE user_id=auth.uid() AND approval_status='approved') THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF _latitude IS NULL OR _longitude IS NULL OR _latitude NOT BETWEEN -90 AND 90 OR _longitude NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid location'; END IF;
 UPDATE public.delivery_assignments SET latitude=_latitude,longitude=_longitude,updated_at=now() WHERE id=_id AND rider_id=auth.uid() AND status='out_for_delivery';
 IF NOT FOUND THEN RAISE EXCEPTION 'Location can only be shared during an active delivery'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.update_my_location(uuid,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_my_location(uuid,numeric,numeric) TO authenticated;