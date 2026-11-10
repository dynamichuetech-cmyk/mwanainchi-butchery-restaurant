ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'inventory_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kitchen_staff';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cashier';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery_manager';
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS assigned_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS assigned_by uuid;
UPDATE public.profiles p SET email=u.email, phone=coalesce(p.phone,u.raw_user_meta_data->>'phone') FROM auth.users u WHERE u.id=p.id;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.profiles(id,full_name,phone,email) VALUES(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'),new.raw_user_meta_data->>'phone',new.email) ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'customer') ON CONFLICT(user_id,role) DO NOTHING;
 RETURN new;
END $$;
CREATE OR REPLACE FUNCTION public.ensure_my_identity() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u record;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT id,email,email_confirmed_at,raw_user_meta_data INTO u FROM auth.users WHERE id=auth.uid();
 IF NOT FOUND OR u.email_confirmed_at IS NULL THEN RAISE EXCEPTION 'Email verification required'; END IF;
 INSERT INTO public.profiles(id,full_name,phone,email) VALUES(u.id,coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name'),u.raw_user_meta_data->>'phone',u.email) ON CONFLICT(id) DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u.id) THEN
  INSERT INTO public.user_roles(user_id,role) VALUES(u.id,'customer') ON CONFLICT(user_id,role) DO NOTHING;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.ensure_my_identity() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_identity() TO authenticated;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid()=_user_id AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated;
CREATE OR REPLACE FUNCTION public.protect_profile_identity() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF current_user IN ('authenticated','anon') AND (new.id IS DISTINCT FROM old.id OR new.email IS DISTINCT FROM old.email OR new.created_at IS DISTINCT FROM old.created_at) THEN
  RAISE EXCEPTION 'Profile identity fields cannot be changed';
 END IF;
 new.updated_at=now(); RETURN new;
END $$;
CREATE TRIGGER profiles_protect_identity BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_identity();
ALTER POLICY "own profile update" ON public.profiles USING(auth.uid()=id) WITH CHECK(auth.uid()=id);
REVOKE ALL ON public.user_roles FROM anon;
REVOKE INSERT,UPDATE,DELETE ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.grant_owner_admin() FROM PUBLIC,anon,authenticated;
COMMENT ON FUNCTION public.ensure_my_identity() IS 'Repairs only the verified caller profile and missing nonprivileged role; accepts no caller-supplied identity or role.';