begin;

create table if not exists public.tm_user_enchants (
  user_id uuid not null references auth.users(id) on delete cascade,
  enchant_code text not null,
  level integer not null check (level between 0 and 6),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id,enchant_code,level)
);

create table if not exists public.tm_enchant_trade_offers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  enchant_code text not null,
  enchant_level integer not null check (enchant_level between 0 and 6),
  quantity integer not null check (quantity > 0),
  price_points bigint not null check (price_points >= 0),
  requested_enchant_code text,
  requested_enchant_level integer,
  requested_quantity integer not null default 0,
  status text not null default 'open' check (status in ('open','accepted','cancelled')),
  buyer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists tm_enchant_trade_offers_open_idx
  on public.tm_enchant_trade_offers(created_at desc) where status='open';

alter table public.tm_user_enchants enable row level security;
alter table public.tm_enchant_trade_offers enable row level security;

drop policy if exists "Users read own enchant inventory" on public.tm_user_enchants;
create policy "Users read own enchant inventory" on public.tm_user_enchants
for select to authenticated using (user_id=auth.uid());

drop policy if exists "Authenticated users read open enchant offers" on public.tm_enchant_trade_offers;
create policy "Authenticated users read open enchant offers" on public.tm_enchant_trade_offers
for select to authenticated using (status='open' or seller_id=auth.uid() or buyer_id=auth.uid());

revoke all on public.tm_user_enchants from anon,authenticated;
grant select on public.tm_user_enchants to authenticated;
revoke all on public.tm_enchant_trade_offers from anon,authenticated;
grant select on public.tm_enchant_trade_offers to authenticated;

create or replace function public.tm_create_enchant_trade_offer(
  p_enchant_code text,p_level integer,p_quantity integer,p_price_points bigint,
  p_requested_enchant_code text default null,p_requested_level integer default null,p_requested_quantity integer default 0
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare offer_id uuid;
begin
  if auth.uid() is null then raise exception 'Musisz się zalogować.'; end if;
  if p_enchant_code not in ('discount','duration','premium','enchanter','weakness','daily','lucky','curiosity','trapmaster','capybara') then raise exception 'Nieznany enchant.'; end if;
  if p_level is null or p_level<0 or p_level>6 or p_quantity is null or p_quantity<1 or p_quantity>99 or p_price_points is null or p_price_points<0 then raise exception 'Nieprawidłowe parametry oferty.'; end if;
  if (p_enchant_code in ('trapmaster','capybara') and p_level<>0)
    or (p_enchant_code='discount' and p_level not between 1 and 5)
    or (p_enchant_code='duration' and p_level not between 1 and 6)
    or (p_enchant_code='premium' and p_level not between 1 and 3)
    or (p_enchant_code='enchanter' and p_level not between 1 and 6)
    or (p_enchant_code='weakness' and p_level not between 1 and 6)
    or (p_enchant_code='daily' and p_level not between 1 and 6)
    or (p_enchant_code='lucky' and p_level not between 1 and 6)
    or (p_enchant_code='curiosity' and p_level not between 1 and 3) then raise exception 'Nieprawidłowy poziom tego enchantu.'; end if;
  if p_requested_quantity<0 or p_requested_quantity>99 then raise exception 'Nieprawidłowa ilość żądanego enchantu.'; end if;
  if p_price_points=0 and p_requested_quantity=0 then raise exception 'Oferta musi wymagać punktów lub innego enchantu.'; end if;
  if p_requested_quantity=0 and (p_requested_enchant_code is not null or p_requested_level is not null) then raise exception 'Wybierz ilość żądanego enchantu.'; end if;
  if p_requested_quantity>0 then
    if p_requested_enchant_code is null or p_requested_enchant_code not in ('discount','duration','premium','enchanter','weakness','daily','lucky','curiosity','trapmaster','capybara') or p_requested_level is null or p_requested_level<0 or p_requested_level>6 then raise exception 'Nieprawidłowy żądany enchant.'; end if;
    if (p_requested_enchant_code in ('trapmaster','capybara') and p_requested_level<>0)
      or (p_requested_enchant_code='discount' and p_requested_level not between 1 and 5)
      or (p_requested_enchant_code='duration' and p_requested_level not between 1 and 6)
      or (p_requested_enchant_code='premium' and p_requested_level not between 1 and 3)
      or (p_requested_enchant_code='enchanter' and p_requested_level not between 1 and 6)
      or (p_requested_enchant_code='weakness' and p_requested_level not between 1 and 6)
      or (p_requested_enchant_code='daily' and p_requested_level not between 1 and 6)
      or (p_requested_enchant_code='lucky' and p_requested_level not between 1 and 6)
      or (p_requested_enchant_code='curiosity' and p_requested_level not between 1 and 3) then raise exception 'Nieprawidłowy poziom żądanego enchantu.'; end if;
  end if;
  update public.tm_user_enchants set quantity=quantity-p_quantity,updated_at=now()
    where user_id=auth.uid() and enchant_code=p_enchant_code and level=p_level and quantity>=p_quantity;
  if not found then raise exception 'Nie masz tylu sztuk tego enchantu.'; end if;
  insert into public.tm_enchant_trade_offers(seller_id,enchant_code,enchant_level,quantity,price_points,requested_enchant_code,requested_enchant_level,requested_quantity)
    values(auth.uid(),p_enchant_code,p_level,p_quantity,p_price_points,p_requested_enchant_code,p_requested_level,p_requested_quantity)
    returning id into offer_id;
  return offer_id;
end;
$$;

create or replace function public.tm_accept_enchant_trade_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare offer public.tm_enchant_trade_offers%rowtype;
declare buyer_balance bigint;
begin
  if auth.uid() is null then raise exception 'Musisz się zalogować.'; end if;
  select * into offer from public.tm_enchant_trade_offers where id=p_offer_id for update;
  if not found or offer.status<>'open' then raise exception 'Ta oferta nie jest już dostępna.'; end if;
  if offer.seller_id=auth.uid() then raise exception 'Nie możesz kupić własnej oferty.'; end if;
  if offer.requested_quantity>0 then
    update public.tm_user_enchants set quantity=quantity-offer.requested_quantity,updated_at=now()
      where user_id=auth.uid() and enchant_code=offer.requested_enchant_code and level=offer.requested_enchant_level and quantity>=offer.requested_quantity;
    if not found then raise exception 'Nie masz enchantu wymaganego w tej ofercie.'; end if;
    insert into public.tm_user_enchants(user_id,enchant_code,level,quantity)
      values(offer.seller_id,offer.requested_enchant_code,offer.requested_enchant_level,offer.requested_quantity)
      on conflict(user_id,enchant_code,level) do update set quantity=public.tm_user_enchants.quantity+excluded.quantity,updated_at=now();
  end if;
  if offer.price_points>0 then
    insert into public.daily_points(user_id,balance) values(auth.uid(),0) on conflict(user_id) do nothing;
    insert into public.daily_points(user_id,balance) values(offer.seller_id,0) on conflict(user_id) do nothing;
    select balance into buyer_balance from public.daily_points where user_id=auth.uid() for update;
    if buyer_balance<offer.price_points then raise exception 'Masz za mało Daily Points.'; end if;
    update public.daily_points set balance=balance-offer.price_points,updated_at=now() where user_id=auth.uid();
    update public.daily_points set balance=balance+offer.price_points,updated_at=now() where user_id=offer.seller_id;
  end if;
  insert into public.tm_user_enchants(user_id,enchant_code,level,quantity)
    values(auth.uid(),offer.enchant_code,offer.enchant_level,offer.quantity)
    on conflict(user_id,enchant_code,level) do update set quantity=public.tm_user_enchants.quantity+excluded.quantity,updated_at=now();
  update public.tm_enchant_trade_offers set status='accepted',buyer_id=auth.uid(),completed_at=now() where id=offer.id;
  insert into public.tm_notifications(user_id,kind,title,body)
    values(offer.seller_id,'enchant_trade','Zrealizowano wymianę','Twoja oferta enchantu została zaakceptowana.');
end;
$$;

create or replace function public.tm_cancel_enchant_trade_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare offer public.tm_enchant_trade_offers%rowtype;
begin
  if auth.uid() is null then raise exception 'Musisz się zalogować.'; end if;
  select * into offer from public.tm_enchant_trade_offers where id=p_offer_id for update;
  if not found or offer.seller_id<>auth.uid() then raise exception 'Nie możesz anulować tej oferty.'; end if;
  if offer.status<>'open' then raise exception 'Ta oferta nie jest już aktywna.'; end if;
  insert into public.tm_user_enchants(user_id,enchant_code,level,quantity)
    values(offer.seller_id,offer.enchant_code,offer.enchant_level,offer.quantity)
    on conflict(user_id,enchant_code,level) do update set quantity=public.tm_user_enchants.quantity+excluded.quantity,updated_at=now();
  update public.tm_enchant_trade_offers set status='cancelled',completed_at=now() where id=offer.id;
end;
$$;

revoke all on function public.tm_create_enchant_trade_offer(text,integer,integer,bigint,text,integer,integer) from public,anon;
revoke all on function public.tm_accept_enchant_trade_offer(uuid) from public,anon;
revoke all on function public.tm_cancel_enchant_trade_offer(uuid) from public,anon;
grant execute on function public.tm_create_enchant_trade_offer(text,integer,integer,bigint,text,integer,integer) to authenticated;
grant execute on function public.tm_accept_enchant_trade_offer(uuid) to authenticated;
grant execute on function public.tm_cancel_enchant_trade_offer(uuid) to authenticated;

commit;
