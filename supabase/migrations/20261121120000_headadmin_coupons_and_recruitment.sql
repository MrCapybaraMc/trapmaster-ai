-- HeadAdmin, single-reviewer recruitment approval, and package-specific discount codes.
alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users add constraint admin_users_role_check
  check (role in ('admin','headadmin','owner'));

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid()) and role in ('admin','headadmin','owner')
  );
$$;

create table if not exists public.discount_codes (
  code text primary key check (code = upper(trim(code)) and char_length(code) between 3 and 40),
  package_type text not null check (package_type in ('day','week','month','forever')),
  discount_percent integer not null check (discount_percent between 1 and 100),
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  disabled_at timestamptz,
  disabled_by uuid references auth.users(id)
);
alter table public.discount_codes enable row level security;
drop policy if exists "Admins manage discount codes" on public.discount_codes;
create policy "Admins manage discount codes" on public.discount_codes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.review_admin_application(p_application_id uuid, p_decision text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_app public.recruitment_applications%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role in ('headadmin','owner')
  ) then raise exception 'Tylko HeadAdmin lub Owner może rozpatrywać podania.'; end if;
  if p_decision not in ('accepted','rejected') then raise exception 'Nieprawidłowa decyzja.'; end if;
  select * into v_app from public.recruitment_applications
    where id = p_application_id for update;
  if not found then raise exception 'Nie znaleziono podania.'; end if;
  if v_app.status <> 'pending' then raise exception 'To podanie zostało już rozpatrzone.'; end if;
  update public.recruitment_applications set status = p_decision where id = p_application_id;
  if p_decision = 'accepted' then
    insert into public.admin_users(user_id, role) values (v_app.user_id, 'admin')
    on conflict (user_id) do nothing;
  end if;
  return jsonb_build_object('success',true,'status',p_decision);
end;
$$;
revoke all on function public.review_admin_application(uuid,text) from public;
grant execute on function public.review_admin_application(uuid,text) to authenticated;

create or replace function public.create_order(p_minecraft_nick text,p_package_type text,p_discount_code text default '')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_price numeric(8,2);
  v_discount integer := 0;
  v_order_id uuid;
  v_paused boolean;
  v_role text;
  v_code public.discount_codes%rowtype;
begin
  if v_user_id is null then raise exception 'Musisz się zalogować.'; end if;
  select role into v_role from public.admin_users where user_id=v_user_id;
  select orders_paused into v_paused from public.site_settings where id=true;
  if coalesce(v_paused,false) then raise exception 'Strona tymczasowo nieczynna.'; end if;
  if p_minecraft_nick is null or p_minecraft_nick !~ '^[A-Za-z0-9_]{3,16}$' then
    raise exception 'Podaj poprawny nick Minecraft (3–16 znaków, litery, cyfry lub _).';
  end if;
  if p_package_type='day' then v_price:=2;
  elsif p_package_type='week' then v_price:=5;
  elsif p_package_type='month' then v_price:=12;
  elsif p_package_type='forever' then v_price:=28;
  else raise exception 'Nieprawidłowy pakiet.'; end if;

  if v_role in ('admin','headadmin','owner') then
    if p_package_type='forever' then v_discount:=20; else v_discount:=30; end if;
  elsif nullif(upper(trim(coalesce(p_discount_code,''))),'') is not null then
    select * into v_code from public.discount_codes
      where code=upper(trim(p_discount_code)) and active=true
        and (expires_at is null or expires_at > now())
      for update;
    if not found then raise exception 'Kod rabatowy jest nieprawidłowy lub wygasł.'; end if;
    if v_code.package_type <> p_package_type then raise exception 'Ten kod nie działa na wybrany pakiet.'; end if;
    v_discount:=v_code.discount_percent;
  end if;

  v_price:=round(v_price*(100-v_discount)/100,2);
  insert into public.orders(user_id,minecraft_nick,package_type,price_m,status)
  values(v_user_id,trim(p_minecraft_nick),p_package_type,v_price,'pending')
  returning id into v_order_id;
  return jsonb_build_object('order_id',v_order_id,'price_m',v_price,'discount_percent',v_discount);
end;
$$;
revoke all on function public.create_order(text,text,text) from public;
grant execute on function public.create_order(text,text,text) to authenticated;
