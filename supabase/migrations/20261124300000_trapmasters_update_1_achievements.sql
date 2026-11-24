-- Achievement definitions and automatic one-time Daily Points rewards.
begin;
insert into public.tm_achievements(id,title,description,points) values
 ('first_download','Pierwsze pobranie','Pobierz swój pierwszy schemat.',25),
 ('downloads_10','Kolekcjoner','Pobierz 10 schematów.',50),
 ('first_review','Pierwsza opinia','Dodaj pierwszą opinię o trapie.',25),
 ('reviews_10','Recenzent','Oceń 10 trapów.',50),
 ('first_transfer','Pierwszy przelew','Wyślij lub odbierz pierwszy przelew Daily Points.',10)
on conflict(id) do update set title=excluded.title,description=excluded.description,points=excluded.points;

create or replace function public.tm_award_achievements(p_user_id uuid)
returns integer language plpgsql security definer set search_path = ''
as $$
declare awarded integer:=0; points_total bigint:=0; titles text;
begin
 if p_user_id is null then return 0; end if;
 with eligible as (
  select a.id,a.points,a.title from public.tm_achievements a
  where (a.id='first_download' and (select count(*) from public.tm_download_events where user_id=p_user_id)>=1)
     or (a.id='downloads_10' and (select count(*) from public.tm_download_events where user_id=p_user_id)>=10)
     or (a.id='first_review' and (select count(*) from public.trap_reviews where user_id=p_user_id)>=1)
     or (a.id='reviews_10' and (select count(*) from public.trap_reviews where user_id=p_user_id)>=10)
     or (a.id='first_transfer' and (select count(*) from public.daily_point_transfers where sender_id=p_user_id or recipient_id=p_user_id)>=1)
 ), inserted as (
  insert into public.user_achievements(user_id,achievement_id)
  select p_user_id,e.id from eligible e
  on conflict(user_id,achievement_id) do nothing
  returning achievement_id
 )
 select coalesce(sum(a.points),0),count(*),string_agg(a.title,', ')
 into points_total,awarded,titles
 from inserted i join public.tm_achievements a on a.id=i.achievement_id;
 if awarded>0 then
  insert into public.daily_points(user_id,balance) values(p_user_id,points_total)
  on conflict(user_id) do update set balance=public.daily_points.balance+excluded.balance,updated_at=now();
  insert into public.tm_notifications(user_id,kind,title,body)
  values(p_user_id,'achievement','Nowe osiągnięcie','Zdobyto: '||coalesce(titles,'osiągnięcie')||'. Przyznano '||points_total||' Daily Points.');
 end if;
 return awarded;
end;
$$;
revoke all on function public.tm_award_achievements(uuid) from public;

create or replace function public.tm_after_download_achievement()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin perform public.tm_award_achievements(new.user_id); return new; end;
$$;
drop trigger if exists tm_download_achievement on public.tm_download_events;
create trigger tm_download_achievement after insert on public.tm_download_events
for each row execute function public.tm_after_download_achievement();

create or replace function public.tm_after_review_achievement()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin perform public.tm_award_achievements(new.user_id); return new; end;
$$;
drop trigger if exists tm_review_achievement on public.trap_reviews;
create trigger tm_review_achievement after insert on public.trap_reviews
for each row execute function public.tm_after_review_achievement();

create or replace function public.tm_after_transfer_achievement()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 perform public.tm_award_achievements(new.sender_id);
 perform public.tm_award_achievements(new.recipient_id);
 return new;
end;
$$;
drop trigger if exists tm_transfer_achievement on public.daily_point_transfers;
create trigger tm_transfer_achievement after insert on public.daily_point_transfers
for each row execute function public.tm_after_transfer_achievement();

commit;