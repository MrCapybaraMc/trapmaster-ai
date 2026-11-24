-- Correct gift entitlement isolation and expose safe tracked-link redirects.
begin;

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
     or exists(select 1 from public.daily_access_grants d where d.user_id=auth.uid() and d.expires_at>now())));
$$;
revoke all on function public.has_trapmaster_access() from public;
grant execute on function public.has_trapmaster_access() to authenticated;

create or replace function public.tm_resolve_tracked_link(p_slug text)
returns text language plpgsql security definer set search_path = ''
as $$
declare target text; link_key uuid;
begin
 select id,destination_url into link_key,target
 from public.tm_tracked_links where slug=trim(coalesce(p_slug,'')) limit 1;
 if link_key is null or target !~ '^https?://' then return null; end if;
 insert into public.tm_tracked_link_hits(link_id) values(link_key);
 return target;
end;
$$;
revoke all on function public.tm_resolve_tracked_link(text) from public;
grant execute on function public.tm_resolve_tracked_link(text) to anon,authenticated;

drop policy if exists "Owner reads tracked link hits" on public.tm_tracked_link_hits;
create policy "Owner reads tracked link hits" on public.tm_tracked_link_hits for select to authenticated
using(public.tm_has_role(array['owner']));

drop policy if exists "Owner reads tracked links" on public.tm_tracked_links;
create policy "Owner reads tracked links" on public.tm_tracked_links for select to authenticated
using(public.tm_has_role(array['owner']));

drop policy if exists "Anonymous page view insert" on public.tm_page_views;
create policy "Anonymous page view insert" on public.tm_page_views for insert to anon
with check(user_id is null and session_key is not null and char_length(session_key) between 8 and 128);

commit;
