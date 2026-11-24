-- Public statistics and privacy-aware active-time accounting.
begin;
create table if not exists public.tm_active_time (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 seconds integer not null check(seconds between 1 and 120),
 page_path text not null,
 occurred_at timestamptz not null default now()
);
alter table public.tm_active_time enable row level security;
create policy "Owner reads active time" on public.tm_active_time for select to authenticated
using(public.tm_has_role(array['owner']));
create index if not exists tm_active_time_user_time_idx on public.tm_active_time(user_id,occurred_at desc);

create or replace function public.tm_log_active_time(p_seconds integer,p_page_path text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
 if auth.uid() is null then return; end if;
 if p_seconds<1 or p_seconds>120 then raise exception 'Nieprawidłowy interwał czasu.'; end if;
 insert into public.tm_active_time(user_id,seconds,page_path)
 values(auth.uid(),p_seconds,left(coalesce(p_page_path,''),300));
end;
$$;
revoke all on function public.tm_log_active_time(integer,text) from public;
grant execute on function public.tm_log_active_time(integer,text) to authenticated;

create or replace function public.tm_public_stats()
returns jsonb language sql stable security definer set search_path = ''
as $$
 select jsonb_build_object(
  'total_accounts',(select count(*) from auth.users),
  'site_started_at',(select min(created_at) from auth.users),
  'site_visits',(select count(*) from public.tm_page_views),
  'active_users_30d',(select count(distinct user_id) from public.tm_page_views where user_id is not null and viewed_at>now()-interval '30 days'),
  'admins',(select count(distinct user_id) from public.user_roles where role in ('admin','headadmin','owner')),
  'headadmins',(select count(distinct user_id) from public.user_roles where role='headadmin'),
  'trapcreators',(select count(distinct user_id) from public.user_roles where role='trapcreator'),
  'traps',(select count(*) from public.traps where published=true)
 );
$$;
revoke all on function public.tm_public_stats() from public;
grant execute on function public.tm_public_stats() to anon,authenticated;

create or replace function public.tm_public_leaderboards()
returns jsonb language sql stable security definer set search_path = ''
as $$
 select jsonb_build_object(
  'most_downloaded',coalesce((select jsonb_agg(to_jsonb(x)) from (
   select p.nickname as account_name,count(*) as downloads
   from public.tm_download_events d join public.profiles p on p.user_id=d.user_id
   where p.nickname is not null group by p.nickname order by downloads desc,p.nickname limit 10
  ) x),'[]'::jsonb),
  'longest_subscription',coalesce((select jsonb_agg(to_jsonb(x)) from (
   select p.nickname as account_name,
    sum(case when o.expires_at is null then 36500 else greatest(0,extract(epoch from (o.expires_at-o.created_at))/86400) end)::bigint as days
   from public.orders o
   join public.profiles p on p.user_id=case when o.is_gift=true then o.recipient_user_id else o.user_id end
   where o.status='approved' and p.nickname is not null
   group by p.nickname order by days desc,p.nickname limit 10
  ) x),'[]'::jsonb),
  'most_searched',coalesce((select jsonb_agg(to_jsonb(x)) from (
   select p.nickname as account_name,count(*) as searches
   from public.tm_search_events s join public.profiles p on p.user_id=s.user_id
   where p.nickname is not null group by p.nickname order by searches desc,p.nickname limit 10
  ) x),'[]'::jsonb),
  'most_active',coalesce((select jsonb_agg(to_jsonb(x)) from (
   select p.nickname as account_name,sum(a.seconds)::bigint as seconds
   from public.tm_active_time a join public.profiles p on p.user_id=a.user_id
   where p.nickname is not null group by p.nickname order by seconds desc,p.nickname limit 10
  ) x),'[]'::jsonb)
 );
$$;
revoke all on function public.tm_public_leaderboards() from public;
grant execute on function public.tm_public_leaderboards() to anon,authenticated;

commit;
