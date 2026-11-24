-- Update 1.0 follow-up: account nick transfers, gifts and automatic notifications.
-- Beta database only.
begin;

create or replace function public.tm_transfer_daily_points_to_nick(p_recipient_nick text,p_amount bigint)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare recipient uuid; sender_balance bigint; previous_transfer timestamptz;
begin
 if auth.uid() is null then raise exception 'Musisz się zalogować.'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'Kwota musi być większa od zera.'; end if;
 select user_id into recipient from public.profiles
 where lower(trim(nickname))=lower(trim(coalesce(p_recipient_nick,''))) limit 1;
 if recipient is null then raise exception 'Nie znaleziono konta o takim nicku.'; end if;
 if recipient=auth.uid() then raise exception 'Nie możesz przelać punktów samemu sobie.'; end if;
 insert into public.daily_points(user_id,balance) values(auth.uid(),0) on conflict do nothing;
 select balance into sender_balance from public.daily_points where user_id=auth.uid() for update;
 if p_amount>floor(sender_balance*0.8) then raise exception 'Możesz przelać maksymalnie 80%% aktualnego salda.'; end if;
 select max(created_at) into previous_transfer from public.daily_point_transfers where sender_id=auth.uid();
 if previous_transfer is not null and previous_transfer>now()-interval '2 days' then
   raise exception 'Przelew jest możliwy raz na 2 dni.';
 end if;
 update public.daily_points set balance=balance-p_amount,updated_at=now() where user_id=auth.uid();
 insert into public.daily_points(user_id,balance) values(recipient,0) on conflict do nothing;
 update public.daily_points set balance=balance+p_amount,updated_at=now() where user_id=recipient;
 insert into public.daily_point_transfers(sender_id,recipient_id,amount) values(auth.uid(),recipient,p_amount);
 insert into public.tm_notifications(user_id,kind,title,body)
 values(recipient,'daily_transfer','Otrzymano Daily Points','Otrzymano przelew punktów od innego użytkownika.');
 return jsonb_build_object('success',true);
end;
$$;
revoke all on function public.tm_transfer_daily_points_to_nick(text,bigint) from public;
grant execute on function public.tm_transfer_daily_points_to_nick(text,bigint) to authenticated;

create or replace function public.tm_create_gift_order(p_recipient_nick text,p_package_type text,p_message text default '')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare recipient uuid; price numeric(10,2); order_id uuid; has_paid_package boolean;
begin
 if auth.uid() is null then raise exception 'Musisz się zalogować.'; end if;
 select exists(select 1 from public.orders where user_id=auth.uid() and status='approved'
   and (expires_at is null or expires_at>now())) into has_paid_package;
 if not has_paid_package then raise exception 'Aktywny zakupiony pakiet jest wymagany, aby kupić pakiet dla innego konta.'; end if;
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

create or replace function public.tm_record_trap_download(p_trap_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
 if auth.uid() is null then raise exception 'Musisz się zalogować.'; end if;
 if not exists(select 1 from public.traps where id=p_trap_id and published=true) then raise exception 'Nie znaleziono opublikowanego trapa.'; end if;
 insert into public.tm_download_events(user_id,trap_id) values(auth.uid(),p_trap_id);
 insert into public.trap_views(user_id,trap_id) values(auth.uid(),p_trap_id);
end;
$$;
revoke all on function public.tm_record_trap_download(uuid) from public;
grant execute on function public.tm_record_trap_download(uuid) to authenticated;

-- Notify affected teams without exposing a client-side notification insertion privilege.
create or replace function public.tm_after_trap_proposal()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.tm_notifications(user_id,kind,title,body)
 select distinct user_id,'trap_proposal','Nowa propozycja trapa','Pojawiła się nowa propozycja do sprawdzenia.'
 from public.user_roles where role in ('trapcreator','owner');
 return new;
end;
$$;
drop trigger if exists tm_trap_proposal_notify on public.trap_proposals;
create trigger tm_trap_proposal_notify after insert on public.trap_proposals
for each row execute function public.tm_after_trap_proposal();

create or replace function public.tm_after_site_proposal()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.tm_notifications(user_id,kind,title,body)
 select distinct user_id,'site_proposal','Nowa propozycja strony','Użytkownik przesłał propozycję zmiany strony.'
 from public.user_roles where role in ('admin','headadmin','owner');
 return new;
end;
$$;
drop trigger if exists tm_site_proposal_notify on public.site_proposals;
create trigger tm_site_proposal_notify after insert on public.site_proposals
for each row execute function public.tm_after_site_proposal();

create or replace function public.tm_after_bug_report()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.tm_notifications(user_id,kind,title,body)
 select distinct user_id,'bug_report','Nowe zgłoszenie błędu','Użytkownik zgłosił problem z trapem.'
 from public.user_roles where role in ('admin','headadmin','owner');
 return new;
end;
$$;
drop trigger if exists tm_bug_report_notify on public.trap_bug_reports;
create trigger tm_bug_report_notify after insert on public.trap_bug_reports
for each row execute function public.tm_after_bug_report();

create or replace function public.tm_after_chat_message()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.tm_notifications(user_id,kind,title,body)
 select user_id,'creator_chat','Nowa wiadomość TrapCreatorów','W czacie TrapCreatorów pojawiła się nowa wiadomość.'
 from public.user_roles where role='trapcreator' and user_id<>new.user_id;
 return new;
end;
$$;
drop trigger if exists tm_creator_chat_notify on public.creator_chat_messages;
create trigger tm_creator_chat_notify after insert on public.creator_chat_messages
for each row execute function public.tm_after_chat_message();

create or replace function public.tm_after_trap_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.tm_notifications(user_id,kind,title,body,href)
 select distinct ur.user_id,'new_trap','Dodano nowy trap',new.title,'/update-1'
 from public.user_roles ur where ur.role in ('trapmasters','trapcreator') and ur.user_id<>new.created_by;
 return new;
end;
$$;
drop trigger if exists tm_trap_insert_notify on public.traps;
create trigger tm_trap_insert_notify after insert on public.traps
for each row when (new.published=true)
execute function public.tm_after_trap_insert();

-- Track dismissals, read state and account data through per-user policies.
drop policy if exists "Users manage own notifications" on public.tm_notifications;
create policy "Users manage own notifications" on public.tm_notifications for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());

commit;
