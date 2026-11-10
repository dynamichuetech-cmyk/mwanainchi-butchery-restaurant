REVOKE INSERT,UPDATE ON public.profiles FROM authenticated;
GRANT INSERT(id,full_name,phone,avatar_url) ON public.profiles TO authenticated;
GRANT UPDATE(full_name,phone,avatar_url) ON public.profiles TO authenticated;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid()=_user_id AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND (role=_role OR (_role::text='admin' AND role::text='super_admin')))
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated;