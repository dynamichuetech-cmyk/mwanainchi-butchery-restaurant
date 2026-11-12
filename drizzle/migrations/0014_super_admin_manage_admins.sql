CREATE OR REPLACE FUNCTION public.grant_owner_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF new.id='fb09fe26-f6d9-479d-9ee1-9364b3506c8c'::uuid AND new.email_confirmed_at IS NOT NULL THEN
  INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'super_admin') ON CONFLICT DO NOTHING;
 END IF; RETURN new; END $$;

INSERT INTO public.user_roles(user_id,role)
SELECT id,'super_admin' FROM auth.users WHERE id='fb09fe26-f6d9-479d-9ee1-9364b3506c8c'::uuid AND email_confirmed_at IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.list_admins() RETURNS TABLE(user_id uuid, email text, full_name text, role text, assigned_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.role='super_admin') THEN RAISE EXCEPTION 'Access denied'; END IF;
 RETURN QUERY SELECT r.user_id, u.email::text, p.full_name, r.role::text, r.assigned_at
  FROM public.user_roles r JOIN auth.users u ON u.id=r.user_id LEFT JOIN public.profiles p ON p.id=r.user_id
  WHERE r.role IN ('admin','super_admin') ORDER BY r.assigned_at;
END $$;
REVOKE ALL ON FUNCTION public.list_admins() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_admins() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_admin_role(_email text, _role text, _grant boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target uuid; confirmed timestamptz;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.role='super_admin') THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF _role NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'Invalid role'; END IF;
 SELECT id, email_confirmed_at INTO target, confirmed FROM auth.users WHERE lower(email)=lower(trim(_email));
 IF target IS NULL THEN RAISE EXCEPTION 'No account with that email'; END IF;
 IF _grant THEN
  IF confirmed IS NULL THEN RAISE EXCEPTION 'Email verification required'; END IF;
  INSERT INTO public.user_roles(user_id,role,assigned_by) VALUES(target,_role::public.app_role,auth.uid()) ON CONFLICT DO NOTHING;
 ELSE
  IF target=auth.uid() THEN RAISE EXCEPTION 'You cannot remove your own access'; END IF;
  IF _role='super_admin' AND (SELECT count(*) FROM public.user_roles WHERE role='super_admin')<=1 THEN RAISE EXCEPTION 'At least one super admin is required'; END IF;
  DELETE FROM public.user_roles WHERE user_id=target AND role=_role::public.app_role;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_admin_role(text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_admin_role(text,text,boolean) TO authenticated;