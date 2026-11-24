-- Beta checkout wrapper with the optional 50,000-unit donation.
begin;
alter table public.orders add column if not exists donation_amount_m numeric(10,2) not null default 0 check(donation_amount_m>=0);
alter table public.tm_store_settings alter column donation_minimum set default 50000;
update public.tm_store_settings set donation_minimum=50000 where donation_minimum<=0;

create or replace function public.tm_create_order_with_donation(
 p_minecraft_nick text,p_package_type text,p_discount_codes text default '',p_donation numeric default 0
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare minimum_donation numeric(10,2); donation_m numeric(10,2); result jsonb; order_key uuid; total numeric(10,2);
begin
 if auth.uid() is null then raise exception 'Musisz się zalogować.'; end if;
 if p_donation is null or p_donation<0 or p_donation<>floor(p_donation) then raise exception 'Darowizna musi być liczbą całkowitą lub wynosić 0.'; end if;
 select donation_minimum into minimum_donation from public.tm_store_settings where id=true;
 minimum_donation:=coalesce(minimum_donation,50000);
 if p_donation>0 and p_donation<minimum_donation then
  raise exception 'Minimalna darowizna wynosi %.',minimum_donation;
 end if;
 donation_m:=p_donation/1000000;
 result:=public.create_order(p_minecraft_nick,p_package_type,p_discount_codes);
 order_key:=(result->>'order_id')::uuid;
 update public.orders set donation_amount_m=donation_m,price_m=price_m+donation_m
 where id=order_key returning price_m into total;
 return result||jsonb_build_object('donation_amount',p_donation,'total_price_m',total);
end;
$$;
revoke all on function public.tm_create_order_with_donation(text,text,text,numeric) from public;
grant execute on function public.tm_create_order_with_donation(text,text,text,numeric) to authenticated;
commit;