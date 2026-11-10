CREATE TABLE public.account_access (user_id uuid PRIMARY KEY, active boolean NOT NULL DEFAULT true);
GRANT SELECT ON public.account_access TO authenticated;
GRANT ALL ON public.account_access TO service_role;
ALTER TABLE public.account_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own account access" ON public.account_access FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.rider_profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id), phone text NOT NULL DEFAULT '', approval_status text NOT NULL DEFAULT 'pending_approval' CHECK(approval_status IN ('pending_approval','approved','rejected','suspended')), approved_by uuid, approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.rider_profiles TO authenticated;
GRANT ALL ON public.rider_profiles TO service_role;
ALTER TABLE public.rider_profiles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid()=_user_id AND NOT EXISTS(SELECT 1 FROM public.account_access WHERE user_id=_user_id AND NOT active) AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND (role=_role OR (_role::text='admin' AND role::text='super_admin'))) $$;
CREATE POLICY "own rider status" ON public.rider_profiles FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY "admins review riders" ON public.rider_profiles FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 INSERT INTO public.profiles(id,full_name,phone,email) VALUES(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'),new.raw_user_meta_data->>'phone',new.email) ON CONFLICT(id) DO NOTHING;
 IF new.raw_user_meta_data->>'application_kind'='rider' THEN
  INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'rider') ON CONFLICT DO NOTHING;
  INSERT INTO public.rider_profiles(user_id,phone) VALUES(new.id,coalesce(new.raw_user_meta_data->>'phone','')) ON CONFLICT(user_id) DO NOTHING;
 ELSE INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'customer') ON CONFLICT DO NOTHING;
 END IF; RETURN new; END $$;
CREATE OR REPLACE FUNCTION public.apply_as_rider() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'customer') OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role<>'customer') THEN RAISE EXCEPTION 'Access denied'; END IF;
 INSERT INTO public.rider_profiles(user_id,phone) SELECT id,coalesce(phone,'') FROM public.profiles WHERE id=auth.uid() ON CONFLICT(user_id) DO NOTHING;
 UPDATE public.user_roles SET role='rider' WHERE user_id=auth.uid() AND role='customer'; END $$;
REVOKE ALL ON FUNCTION public.apply_as_rider() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_as_rider() TO authenticated;
CREATE OR REPLACE FUNCTION public.review_rider(_id uuid,_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF _status NOT IN ('approved','rejected','suspended') THEN RAISE EXCEPTION 'Invalid application decision'; END IF;
 IF _status='approved' AND NOT EXISTS(SELECT 1 FROM public.rider_profiles r JOIN auth.users u ON u.id=r.user_id WHERE r.id=_id AND u.email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Email verification required before approval'; END IF;
 UPDATE public.rider_profiles SET approval_status=_status,approved_by=auth.uid(),approved_at=CASE WHEN _status='approved' THEN now() ELSE NULL END,updated_at=now() WHERE id=_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF; END $$;
REVOKE ALL ON FUNCTION public.review_rider(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_rider(uuid,text) TO authenticated;
CREATE TABLE public.delivery_assignments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id), rider_id uuid NOT NULL REFERENCES public.profiles(id), status text NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','out_for_delivery','delivered')), latitude numeric, longitude numeric, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id));
GRANT SELECT ON public.delivery_assignments TO authenticated;
GRANT ALL ON public.delivery_assignments TO service_role;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved own assignments" ON public.delivery_assignments FOR SELECT TO authenticated USING(rider_id=auth.uid() AND public.has_role(auth.uid(),'rider') AND EXISTS(SELECT 1 FROM public.rider_profiles WHERE user_id=auth.uid() AND approval_status='approved'));
CREATE POLICY "admin assignments" ON public.delivery_assignments FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.update_my_delivery(_id uuid,_status text,_latitude numeric DEFAULT NULL,_longitude numeric DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a public.delivery_assignments%ROWTYPE; BEGIN
 IF NOT public.has_role(auth.uid(),'rider') OR NOT EXISTS(SELECT 1 FROM public.rider_profiles WHERE user_id=auth.uid() AND approval_status='approved') THEN RAISE EXCEPTION 'Access denied'; END IF;
 SELECT * INTO a FROM public.delivery_assignments WHERE id=_id AND rider_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR a.status='delivered' THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF _status NOT IN ('out_for_delivery','delivered') OR (_status='delivered' AND a.status<>'out_for_delivery') THEN RAISE EXCEPTION 'Invalid delivery transition'; END IF;
 IF _latitude IS NOT NULL AND (_latitude NOT BETWEEN -90 AND 90 OR _longitude IS NULL OR _longitude NOT BETWEEN -180 AND 180) THEN RAISE EXCEPTION 'Invalid location'; END IF;
 UPDATE public.delivery_assignments SET status=_status,latitude=coalesce(_latitude,latitude),longitude=coalesce(_longitude,longitude),updated_at=now() WHERE id=_id;
 UPDATE public.orders SET status=_status WHERE id=a.order_id;
 END $$;
REVOKE ALL ON FUNCTION public.update_my_delivery(uuid,text,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_my_delivery(uuid,text,numeric,numeric) TO authenticated;