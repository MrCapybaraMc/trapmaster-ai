create or replace function public.has_trapmaster_access()
returns boolean language sql stable security definer set search_path = ''
as $function$
  select public.is_owner()
    or (auth.uid() is not null
      and not exists (select 1 from public.access_revocations r where r.user_id = auth.uid())
      and (public.has_active_gift()
        or exists (select 1 from public.orders o where o.user_id = auth.uid() and o.status='approved' and (o.expires_at is null or o.expires_at > now()))
        or exists (select 1 from public.daily_access_grants d where d.user_id = auth.uid() and d.expires_at > now())));
$function$;

create or replace function public.create_order(p_minecraft_nick text,p_package_type text,p_discount_code text default '')
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_user_id uuid; v_price numeric(8,2); v_discount integer := 0; v_order_id uuid; v_paused boolean; v_role text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Musisz się zalogować.'; end if;
  select role into v_role from public.admin_users where user_id=v_user_id;
  select orders_paused into v_paused from public.site_settings where id=true;
  if coalesce(v_paused,false) then raise exception 'Strona tymczasowo nieczynna.'; end if;
  if p_minecraft_nick is null or p_minecraft_nick !~ '^[A-Za-z0-9_]{3,16}$' then raise exception 'Podaj poprawny nick Minecraft (3–16 znaków, litery, cyfry lub _).'; end if;
  if p_package_type='day' then v_price:=2;
  elsif p_package_type='week' then v_price:=5;
  elsif p_package_type='month' then v_price:=12;
  elsif p_package_type='forever' then v_price:=28;
  else raise exception 'Nieprawidłowy pakiet.'; end if;
  if v_role in ('admin','owner') then
    if p_package_type='forever' then v_discount:=20; else v_discount:=30; end if;
  end if;
  v_price:=round(v_price*(100-v_discount)/100,2);
  insert into public.orders(user_id,minecraft_nick,package_type,price_m,status)
  values(v_user_id,trim(p_minecraft_nick),p_package_type,v_price,'pending') returning id into v_order_id;
  return jsonb_build_object('order_id',v_order_id,'price_m',v_price,'discount_percent',v_discount);
end;
$function$;
revoke all on function public.create_order(text,text,text) from public;
grant execute on function public.create_order(text,text,text) to authenticated;
revoke all on function public.has_trapmaster_access() from public;
grant execute on function public.has_trapmaster_access() to authenticated;
