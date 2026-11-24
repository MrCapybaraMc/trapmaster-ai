-- Restrict personal reward coupons to their recipient and harden coupon lookup.
begin;
alter table public.discount_codes add column if not exists assigned_user_id uuid references auth.users(id) on delete cascade;
create index if not exists discount_codes_assigned_user_idx on public.discount_codes(assigned_user_id);

create or replace function public.create_order(p_minecraft_nick text,p_package_type text,p_discount_code text default '')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 v_user_id uuid:=auth.uid(); v_price numeric(10,2); v_base_discount numeric(5,2):=0;
 v_total_discount numeric(5,2):=0; v_order_id uuid; v_paused boolean;
 v_codes text[]:='{}'; v_code text; v_coupon public.discount_codes%rowtype;
 v_stacking boolean:=false; v_max_discount numeric(5,2):=100; v_role_staff boolean:=false;
begin
 if v_user_id is null then raise exception 'Musisz się zalogować.'; end if;
 select orders_paused into v_paused from public.site_settings where id=true;
 if coalesce(v_paused,false) then raise exception 'Strona tymczasowo nieczynna.'; end if;
 if p_minecraft_nick is null or p_minecraft_nick !~ '^[A-Za-z0-9_]{3,16}$' then raise exception 'Podaj poprawny nick Minecraft (3–16 znaków, litery, cyfry lub _).'; end if;
 if p_package_type not in ('day','week','month','forever') then raise exception 'Nieprawidłowy pakiet.'; end if;
 select coalesce((package_prices->>p_package_type)::numeric,case p_package_type when 'day' then 2 when 'week' then 5 when 'month' then 12 else 28 end),
  discount_stacking,max_discount_percent into v_price,v_stacking,v_max_discount
 from public.tm_store_settings where id=true;
 if v_price is null then v_price:=case p_package_type when 'day' then 2 when 'week' then 5 when 'month' then 12 else 28 end; end if;
 if v_price<=0 then raise exception 'Cena pakietu nie jest poprawnie skonfigurowana.'; end if;
 v_role_staff:=public.tm_has_role(array['admin','headadmin','owner']);
 if v_role_staff then v_base_discount:=case when p_package_type='forever' then 20 else 30 end; end if;
 v_total_discount:=v_base_discount;
 for v_code in select distinct trim(x) from unnest(regexp_split_to_array(upper(coalesce(p_discount_code,'')),'[,;]+')) as x where trim(x)<>''
 loop
  select * into v_coupon from public.discount_codes
  where code=v_code and active=true and package_type=p_package_type
   and (assigned_user_id is null or assigned_user_id=v_user_id)
   and (expires_at is null or expires_at>now())
  for update;
  if not found then raise exception 'Kod % jest nieprawidłowy, przypisany do innego konta, wygasł lub nie pasuje do pakietu.',v_code; end if;
  if v_coupon.max_uses is not null and v_coupon.use_count>=v_coupon.max_uses then raise exception 'Limit użyć kodu % został osiągnięty.',v_code; end if;
  v_codes:=array_append(v_codes,v_code); v_total_discount:=v_total_discount+v_coupon.discount_percent;
 end loop;
 if not v_stacking and cardinality(v_codes)>1 then raise exception 'Łączenie kilku kodów jest obecnie wyłączone.'; end if;
 v_total_discount:=least(v_total_discount,v_max_discount,100);
 v_price:=round(v_price*(100-v_total_discount)/100,2);
 insert into public.orders(user_id,minecraft_nick,package_type,price_m,status)
 values(v_user_id,trim(p_minecraft_nick),p_package_type,v_price,'pending') returning id into v_order_id;
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

create or replace function public.get_discount_code_discount(p_code text,p_package_type text)
returns integer language plpgsql stable security definer set search_path = ''
as $$
declare v_discount integer;
begin
 if auth.uid() is null then raise exception 'Musisz się zalogować.'; end if;
 select discount_percent into v_discount from public.discount_codes
 where code=upper(trim(coalesce(p_code,''))) and active=true
 and (assigned_user_id is null or assigned_user_id=auth.uid())
 and package_type=p_package_type and (expires_at is null or expires_at>now())
 and (max_uses is null or use_count<max_uses);
 return coalesce(v_discount,0);
end;
$$;
revoke all on function public.get_discount_code_discount(text,text) from public;
grant execute on function public.get_discount_code_discount(text,text) to authenticated;

create or replace function public.tm_review_youtube_reward(p_submission_id uuid,p_decision text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare item public.tm_youtube_reward_submissions%rowtype; prefix text; expiry_time timestamptz; codes text[];
begin
 if not public.tm_has_role(array['admin','headadmin','owner']) then raise exception 'Brak uprawnień.'; end if;
 if p_decision not in ('approved','rejected','manual_review') then raise exception 'Nieprawidłowa decyzja.'; end if;
 select * into item from public.tm_youtube_reward_submissions where id=p_submission_id for update;
 if not found or item.status not in ('pending','manual_review') then raise exception 'Nie znaleziono oczekującego zgłoszenia.'; end if;
 if p_decision<>'approved' then
  update public.tm_youtube_reward_submissions set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now() where id=p_submission_id;
  return jsonb_build_object('success',true,'status',p_decision);
 end if;
 expiry_time:=now()+interval '24 hours';
 prefix:='YT'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
 codes:=array[prefix||'D',prefix||'W',prefix||'M',prefix||'F'];
 insert into public.discount_codes(code,package_type,discount_percent,expires_at,active,created_by,assigned_user_id)
 values(codes[1],'day',8,expiry_time,true,auth.uid(),item.user_id),
       (codes[2],'week',8,expiry_time,true,auth.uid(),item.user_id),
       (codes[3],'month',8,expiry_time,true,auth.uid(),item.user_id),
       (codes[4],'forever',8,expiry_time,true,auth.uid(),item.user_id);
 update public.tm_youtube_reward_submissions set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),expires_at=expiry_time where id=p_submission_id;
 insert into public.tm_notifications(user_id,kind,title,body)
 values(item.user_id,'youtube_reward','Nagroda YouTube zatwierdzona',
 'Twoje osobiste kody 8% ważne przez 24 godziny: dzień '||codes[1]||', tydzień '||codes[2]||', miesiąc '||codes[3]||', na zawsze '||codes[4]||'.');
 return jsonb_build_object('success',true,'expires_at',expiry_time,'codes',codes);
end;
$$;
revoke all on function public.tm_review_youtube_reward(uuid,text) from public;
grant execute on function public.tm_review_youtube_reward(uuid,text) to authenticated;

commit;
