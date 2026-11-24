-- Update 1.0 in-app and Discord outbox notifications.
begin;

create table if not exists public.tm_discord_outbox (
 id bigint generated always as identity primary key,
 event_type text not null,
 payload jsonb not null,
 attempts integer not null default 0,
 delivered_at timestamptz,
 last_error text,
 created_at timestamptz not null default now()
);
alter table public.tm_discord_outbox enable row level security;

create or replace function public.tm_after_order_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.tm_notifications(user_id,kind,title,body)
 select distinct user_id,'new_order','Nowe zamówienie','Wpłynęło nowe zamówienie pakietu do sprawdzenia.'
 from public.user_roles where role in ('admin','headadmin','owner');
 insert into public.tm_discord_outbox(event_type,payload)
 values('new_order',jsonb_build_object('order_id',new.id,'minecraft_nick',new.minecraft_nick,
  'package_type',new.package_type,'price',new.price_m,'status',new.status,'gift',coalesce(new.is_gift,false)));
 return new;
end;
$$;
drop trigger if exists tm_order_insert_notify on public.orders;
create trigger tm_order_insert_notify after insert on public.orders
for each row execute function public.tm_after_order_insert();

create or replace function public.tm_after_order_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if new.status is distinct from old.status then
  if new.is_gift=true and new.status='approved' and new.recipient_user_id is not null then
   insert into public.tm_notifications(user_id,kind,title,body)
   values(new.recipient_user_id,'gift_package','Otrzymano pakiet TrapMasters',
    'Pakiet TrapMasters został przyznany na Twoje konto.');
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
drop trigger if exists tm_order_update_notify on public.orders;
create trigger tm_order_update_notify after update of status on public.orders
for each row execute function public.tm_after_order_update();

create or replace function public.tm_after_trap_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.tm_notifications(user_id,kind,title,body,href)
 select distinct recipients.user_id,'new_trap','Dodano nowy trap',new.title,'/update-1'
 from (
  select ur.user_id from public.user_roles ur where ur.role in ('trapmasters','trapcreator')
  union
  select o.user_id from public.orders o where o.status='approved' and (o.expires_at is null or o.expires_at>now()) and coalesce(o.is_gift,false)=false
  union
  select o.recipient_user_id from public.orders o where o.status='approved' and o.is_gift=true and o.recipient_user_id is not null and (o.expires_at is null or o.expires_at>now())
 ) recipients where recipients.user_id<>new.created_by;
 return new;
end;
$$;

create or replace function public.tm_after_event_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.tm_notifications(user_id,kind,title,body)
 select distinct recipients.user_id,'new_event','Nowe wydarzenie: '||new.title,'Dodano nowe wydarzenie w TrapMasters.'
 from (
  select o.user_id from public.orders o where o.status='approved' and (o.expires_at is null or o.expires_at>now()) and coalesce(o.is_gift,false)=false
  union select o.recipient_user_id from public.orders o where o.status='approved' and o.is_gift=true and o.recipient_user_id is not null and (o.expires_at is null or o.expires_at>now())
  union select user_id from public.user_roles where role in ('trapcreator','trapmasters','admin','headadmin','owner')
 ) recipients;
 return new;
end;
$$;
drop trigger if exists tm_event_insert_notify on public.tm_events;
create trigger tm_event_insert_notify after insert on public.tm_events
for each row execute function public.tm_after_event_insert();

create or replace function public.tm_after_collaboration_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.tm_notifications(user_id,kind,title,body)
 select distinct user_id,'collaboration_application','Nowe zgłoszenie współpracy','Otrzymano nowe zgłoszenie współpracy.'
 from public.user_roles where role in ('headadmin','owner');
 return new;
end;
$$;
drop trigger if exists tm_collaboration_insert_notify on public.collaboration_applications;
create trigger tm_collaboration_insert_notify after insert on public.collaboration_applications
for each row execute function public.tm_after_collaboration_insert();

create or replace function public.tm_after_bug_report()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.tm_notifications(user_id,kind,title,body)
 select distinct user_id,'bug_report','Nowe zgłoszenie błędu','Użytkownik zgłosił problem z trapem.'
 from public.user_roles where role in ('admin','headadmin','owner');
 insert into public.tm_discord_outbox(event_type,payload)
 values('bug_report',jsonb_build_object('report_id',new.id,'category',new.category,'details',left(new.details,1000)));
 return new;
end;
$$;

commit;
