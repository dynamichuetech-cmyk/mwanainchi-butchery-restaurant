DO $$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.place_order(jsonb)'::regprocedure) INTO definition;
 definition := replace(definition, 'pr record; z record; s record;', 'pr record; z public.delivery_zones%ROWTYPE; s record;');
 definition := replace(definition, 'if uid is null then raise exception ''Please sign in to place an order''; end if;', 'if uid is null then raise exception ''Please sign in to place an order''; end if;
 if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception ''Email verification required''; end if;
 if not public.has_role(uid,''customer'') or exists(select 1 from public.user_roles where user_id=uid and role<>''customer'') then raise exception ''Customer account required''; end if;');
 EXECUTE definition;
END $$;
REVOKE ALL ON FUNCTION public.place_order(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb) TO authenticated;