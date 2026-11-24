begin;
drop policy if exists "Creators edit own profile" on public.creator_profiles;
create policy "Creators edit own profile" on public.creator_profiles for update to authenticated
using((user_id=auth.uid() and public.tm_has_role(array['trapcreator'])) or public.tm_has_role(array['owner']))
with check((user_id=auth.uid() and public.tm_has_role(array['trapcreator'])) or public.tm_has_role(array['owner']));
commit;

create or replace function public.tm_public_leaderboards()
returns jsonb language sql stable security definer set search_path = ''
as $$
 select jsonb_build_object(
  'most_downloaded',coalesce((select jsonb_agg(to_jsonb(x)) from (
   select p.nickname as account_name,count(*) as downloads
   from public.tm_download_events d join public.profiles p on p.user_id=d.user_id
   where p.nickname is not null and exists(select 1 from public.orders o where
    ((o.user_id=d.user_id and coalesce(o.is_gift,false)=false) or (o.recipient_user_id=d.user_id and o.is_gift=true))
    and o.status='approved' and (o.expires_at is null or o.expires_at>now()))
   group by p.nickname order by downloads desc,p.nickname limit 10
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
   where p.nickname is not null and exists(select 1 from public.orders o where
    ((o.user_id=s.user_id and coalesce(o.is_gift,false)=false) or (o.recipient_user_id=s.user_id and o.is_gift=true))
    and o.status='approved' and (o.expires_at is null or o.expires_at>now()))
   group by p.nickname order by searches desc,p.nickname limit 10
  ) x),'[]'::jsonb),
  'most_active',coalesce((select jsonb_agg(to_jsonb(x)) from (
   select p.nickname as account_name,sum(a.seconds)::bigint as seconds
   from public.tm_active_time a join public.profiles p on p.user_id=a.user_id
   where p.nickname is not null and exists(select 1 from public.orders o where
    ((o.user_id=a.user_id and coalesce(o.is_gift,false)=false) or (o.recipient_user_id=a.user_id and o.is_gift=true))
    and o.status='approved' and (o.expires_at is null or o.expires_at>now()))
   group by p.nickname order by seconds desc,p.nickname limit 10
  ) x),'[]'::jsonb)
 );
$$;
revoke all on function public.tm_public_leaderboards() from public;
grant execute on function public.tm_public_leaderboards() to anon,authenticated;