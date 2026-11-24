-- Tighten gift purchase eligibility and deliver buyer's optional note.
begin;
create or replace function public.tm_create_gift_order(p_recipient_nick text,p_package_type text,p_message text default '')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare recipient uuid; price numeric(10,2); order_id uuid; has_paid_package boolean;
begin
 if auth.uid() is null then raise exception 'Musisz się zalogować.'; end if;
 select exists(select 1 from public.orders where user_id=auth.uid() and coalesce(is_gift,false)=false
   and status='approved' and (expires_at is null or expires_at>now())
   and not exists(select 1 from public.access_revocations r where r.user_id=auth.uid())) into has_paid_package;
 if not has_paid_package then raise exception 'Aktywny zakupiony pakiet na Twoim koncie jest wymagany, aby kupić pakiet dla innego konta.'; end if;
 select user_id into recipient from public.profiles
 where lower(trim(nickname))=lower(trim(coalesce(p_recipient_nick,''))) limit 1;
 if recipient is null then raise exception 'Nie znaleziono konta odbiorcy.'; end if;
 if recipient=auth.uid() then raise exception 'Wpisz nick innego konta.'; end if;
 if p_package_type not in ('day','week','month','forever') then raise exception 'Nieprawidłowy pakiet.'; end if;
 select (package_prices->>p_package_type)::numeric into price from public.tm_store_settings where id=true;
 if price is null or price<=0 then raise exception 'Cena tego pakietu nie jest skonfigurowana.'; end if;
 insert into public.orders(user_id,minecraft_nick,package_type,price_m,status,recipient_user_id,recipient_minecraft_nick,buyer_message,is_gift)
 values(auth.uid(),trim(p_recipient_nick),p_package_type,price,'pending',recipient,trim(p_recipient_nick),trim(coalesce(p_message,'')),true)
 returning id into order_id;
 return jsonb_build_object('success',true,'order_id',order_id,'price',price,'recipient_nick',trim(p_recipient_nick));
end;
$$;
revoke all on function public.tm_create_gift_order(text,text,text) from public;
grant execute on function public.tm_create_gift_order(text,text,text) to authenticated;

create or replace function public.tm_after_order_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if new.status is distinct from old.status then
  if new.is_gift=true and new.status='approved' and new.recipient_user_id is not null then
   insert into public.tm_notifications(user_id,kind,title,body)
   values(new.recipient_user_id,'gift_package','Otrzymano pakiet TrapMasters',
    'Pakiet TrapMasters został przyznany na Twoje konto.'||
    case when coalesce(new.buyer_message,'')<>'' then ' Wiadomość od kupującego: '||new.buyer_message else '' end);
  elsif new.status='rejected' then
   insert into public.tm_notifications(user_id,kind,title,body)
   values(new.user_id,'order_rejected','Zamówienie odrzucone','Twoje zamówienie zostało odrzucone. Skontaktuj się z administracją w razie pytań.');
  end if;
  insert into public.tm_discord_outbox(event_type,payload)
  values('order_status',jsonb_build_object('order_id',new.id,'status',new.status,'minecraft_nick',new.minecraft_nick,'gift',coalesce(new.is_gift,false)));
 end if;
 return new;
end;
$$;
commit;