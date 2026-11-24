-- Update 1.0 store pricing, additive discounts and fully-applied SuperCombo rewards.
begin;

alter table public.tm_store_settings add column if not exists discount_stacking boolean not null default false;
alter table public.tm_store_settings add column if not exists max_discount_percent numeric(5,2) not null default 100 check(max_discount_percent between 1 and 100);
alter table public.discount_codes add column if not exists max_uses integer;
alter table public.discount_codes add column if not exists use_count integer not null default 0;
alter table public.discount_codes add constraint discount_codes_max_uses_check check(max_uses is null or max_uses>0);
alter table public.discount_codes add constraint discount_codes_use_count_check check(use_count>=0);

alter table public.orders drop constraint if exists orders_price_m_check;
alter table public.orders add constraint orders_price_m_check check(price_m>=0 and price_m<=100000);

create table if not exists public.tm_supercombo_reward_grants (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 reward_type text not null check(reward_type in ('trapmasters_hours','discount')),
 value numeric(10,2) not null check(value>0),
 expires_at timestamptz,
 source_code text not null,
 created_at timestamptz not null default now()
);
alter table public.tm_supercombo_reward_grants enable row level security;
create policy "Users read own reward grants" on public.tm_supercombo_reward_grants for select to authenticated
using(user_id=auth.uid() or public.tm_has_role(array['owner']));

create or replace function public.create_order(p_minecraft_nick text,p_package_type text,p_discount_code text default '')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 v_user_id uuid:=auth.uid();
 v_price numeric(10,2);
 v_base_discount numeric(5,2):=0;
 v_total_discount numeric(5,2):=0;
 v_order_id uuid;
 v_paused boolean;
 v_codes text[]:='{}';
 v_code text;
 v_coupon public.discount_codes%rowtype;
 v_stacking boolean:=false;
 v_max_discount numeric(5,2):=100;
 v_role_staff boolean:=false;
begin
 if v_user_id is null then raise exception 'Musisz się zalogować.'; end if;
 select orders_paused into v_paused from public.site_settings where id=true;
 if coalesce(v_paused,false) then raise exception 'Strona tymczasowo nieczynna.'; end if;
 if p_minecraft_nick is null or p_minecraft_nick !~ '^[A-Za-z0-9_]{3,16}$' then
  raise exception 'Podaj poprawny nick Minecraft (3–16 znaków, litery, cyfry lub _).';
 end if;
 if p_package_type not in ('day','week','month','forever') then raise exception 'Nieprawidłowy pakiet.'; end if;

 select coalesce((package_prices->>p_package_type)::numeric,
  case p_package_type when 'day' then 2 when 'week' then 5 when 'month' then 12 else 28 end),
  discount_stacking,max_discount_percent
 into v_price,v_stacking,v_max_discount from public.tm_store_settings where id=true;
 if v_price is null then
  v_price:=case p_package_type when 'day' then 2 when 'week' then 5 when 'month' then 12 else 28 end;
 end if;
 if v_price<=0 then raise exception 'Cena pakietu nie jest poprawnie skonfigurowana.'; end if;

 v_role_staff:=public.tm_has_role(array['admin','headadmin','owner']);
 if v_role_staff then
  if p_package_type='forever' then v_base_discount:=20; else v_base_discount:=30; end if;
 end if;
 v_total_discount:=v_base_discount;

 for v_code in
  select distinct trim(x) from unnest(regexp_split_to_array(upper(coalesce(p_discount_code,'')),'[,;]+')) as x
  where trim(x)<>''
 loop
  select * into v_coupon from public.discount_codes
  where code=v_code and active=true and package_type=p_package_type
    and (expires_at is null or expires_at>now())
  for update;
  if not found then raise exception 'Kod % jest nieprawidłowy, wygasł lub nie pasuje do pakietu.',v_code; end if;
  if v_coupon.max_uses is not null and v_coupon.use_count>=v_coupon.max_uses then
   raise exception 'Limit użyć kodu % został osiągnięty.',v_code;
  end if;
  v_codes:=array_append(v_codes,v_code);
  v_total_discount:=v_total_discount+v_coupon.discount_percent;
 end loop;

 if not v_stacking and cardinality(v_codes)>1 then
  raise exception 'Łączenie kilku kodów jest obecnie wyłączone.';
 end if;
 v_total_discount:=least(v_total_discount,v_max_discount,100);
 v_price:=round(v_price*(100-v_total_discount)/100,2);

 insert into public.orders(user_id,minecraft_nick,package_type,price_m,status)
 values(v_user_id,trim(p_minecraft_nick),p_package_type,v_price,'pending')
 returning id into v_order_id;

 foreach v_code in array v_codes loop
  update public.discount_codes set use_count=use_count+1 where code=v_code;
  insert into public.tm_discount_usage(code,user_id,order_id,discount_percent)
  select v_code,v_user_id,v_order_id,discount_percent from public.discount_codes where code=v_code;
 end loop;

 return jsonb_build_object('order_id',v_order_id,'price_m',v_price,'discount_percent',v_total_discount,'discount_codes',to_jsonb(v_codes));
end;
$$;
revoke all on function public.create_order(text,text,text) from public;
grant execute on function public.create_order(text,text,text) to authenticated;

create or replace function public.tm_redeem_supercombo(p_code text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 c public.tm_supercombo_codes%rowtype;
 reward jsonb;
 reward_type text;
 amount numeric;
 prefix text;
 expiry timestamptz;
 codes text[]:='{}';
begin
 if auth.uid() is null then raise exception 'Musisz się zalogować.'; end if;
 select * into c from public.tm_supercombo_codes
 where code=upper(trim(coalesce(p_code,''))) and active=true
 and (expires_at is null or expires_at>now())
 for update;
 if not found then raise exception 'Kod jest nieprawidłowy lub wygasł.'; end if;
 if c.max_uses is not null and c.uses>=c.max_uses then raise exception 'Limit użyć kodu został osiągnięty.'; end if;
 insert into public.tm_supercombo_redemptions(code,user_id) values(c.code,auth.uid());
 update public.tm_supercombo_codes set uses=uses+1 where code=c.code;
 insert into public.tm_supercombo_audit(code,user_id,reward_snapshot) values(c.code,auth.uid(),c.rewards);

 for reward in select value from jsonb_array_elements(coalesce(c.rewards,'[]'::jsonb)) loop
  reward_type:=coalesce(reward->>'type','');
  amount:=nullif(reward->>'amount','')::numeric;
  if reward_type='daily_points' then
   if amount is null or amount<=0 or amount>1000000000 then raise exception 'Nieprawidłowa nagroda Daily Points.'; end if;
   insert into public.daily_points(user_id,balance) values(auth.uid(),amount::bigint)
   on conflict(user_id) do update set balance=public.daily_points.balance+excluded.balance,updated_at=now();
  elsif reward_type='trapmasters_hours' then
   if amount is null or amount<=0 or amount>8760 then raise exception 'Nieprawidłowa liczba godzin dostępu.'; end if;
   expiry:=now()+(amount*interval '1 hour');
   insert into public.tm_supercombo_reward_grants(user_id,reward_type,value,expires_at,source_code)
   values(auth.uid(),'trapmasters_hours',amount,expiry,c.code);
  elsif reward_type='discount' then
   if amount is null or amount<1 or amount>100 then raise exception 'Rabat musi wynosić 1–100%.'; end if;
   prefix:='SC'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
   codes:=array[prefix||'D',prefix||'W',prefix||'M',prefix||'F'];
   expiry:=coalesce(c.expires_at,now()+interval '30 days');
   insert into public.discount_codes(code,package_type,discount_percent,expires_at,active,created_by)
   values(codes[1],'day',amount::integer,expiry,true,auth.uid()),
         (codes[2],'week',amount::integer,expiry,true,auth.uid()),
         (codes[3],'month',amount::integer,expiry,true,auth.uid()),
         (codes[4],'forever',amount::integer,expiry,true,auth.uid());
  else
   raise exception 'Nieznany typ nagrody SuperCombo: %',reward_type;
  end if;
 end loop;

 insert into public.tm_notifications(user_id,kind,title,body)
 values(auth.uid(),'supercombo','Kod SuperCombo wykorzystany',
 'Nagrody z kodu '||c.code||' zostały przypisane do konta.'||
 case when cardinality(codes)>0 then ' Kody rabatowe: '||array_to_string(codes,', ') else '' end);
 return jsonb_build_object('success',true,'discount_codes',codes);
exception when unique_violation then
 raise exception 'Ten kod został już wykorzystany lub wygenerowany kod jest zajęty.';
end;
$$;
revoke all on function public.tm_redeem_supercombo(text) from public;
grant execute on function public.tm_redeem_supercombo(text) to authenticated;

create or replace function public.has_trapmaster_access()
returns boolean language sql stable security definer set search_path = ''
as $$
 select public.is_owner()
 or public.tm_has_role(array['trapmasters','trapcreator'])
 or (auth.uid() is not null
   and not exists(select 1 from public.access_revocations r where r.user_id=auth.uid())
   and (public.has_active_gift()
     or exists(select 1 from public.orders o
       where ((o.user_id=auth.uid() and coalesce(o.is_gift,false)=false)
          or (o.recipient_user_id=auth.uid() and o.is_gift=true))
       and o.status='approved' and (o.expires_at is null or o.expires_at>now()))
     or exists(select 1 from public.daily_access_grants d where d.user_id=auth.uid() and d.expires_at>now())
     or exists(select 1 from public.tm_supercombo_reward_grants g where g.user_id=auth.uid() and g.reward_type='trapmasters_hours' and g.expires_at>now())));
$$;
revoke all on function public.has_trapmaster_access() from public;
grant execute on function public.has_trapmaster_access() to authenticated;

create or replace function public.tm_admin_overview()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
 if not public.tm_has_role(array['admin','headadmin','owner']) then raise exception 'Brak uprawnień.'; end if;
 select jsonb_build_object(
  'accounts',(select count(*) from auth.users),
  'admins',(select count(distinct user_id) from public.user_roles where role in ('admin','headadmin','owner')),
  'headadmins',(select count(distinct user_id) from public.user_roles where role='headadmin'),
  'trapcreators',(select count(distinct user_id) from public.user_roles where role='trapcreator'),
  'traps',(select count(*) from public.traps),
  'downloads',(select count(*) from public.tm_download_events),
  'site_visits',(select count(*) from public.tm_page_views),
  'tracked_link_clicks',(select count(*) from public.tm_tracked_link_hits),
  'open_bug_reports',(select count(*) from public.trap_bug_reports where status='open'),
  'pending_trap_proposals',(select count(*) from public.trap_proposals where status='pending'),
  'pending_collaborations',(select count(*) from public.collaboration_applications where status='pending')
 ) into result;
 return result;
end;
$$;
revoke all on function public.tm_admin_overview() from public;
grant execute on function public.tm_admin_overview() to authenticated;

commit;
