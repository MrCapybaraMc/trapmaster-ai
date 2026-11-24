-- Security and access-policy corrections for the Update 1.0 beta.
begin;

alter table public.tm_user_settings add column if not exists uses_puller boolean not null default false;

drop policy if exists "Users read own roles" on public.user_roles;
create policy "Users read own roles" on public.user_roles for select to authenticated using(user_id=auth.uid());

-- TrapMasters package holders and staff can read the catalogue. Backup records are
-- visible only when the current user's saved setup says they do not use Puller.
drop policy if exists "Published traps readable" on public.traps;
create policy "Entitled users read traps" on public.traps for select to authenticated
using (
 (published=true or created_by=auth.uid() or public.tm_has_role(array['admin','headadmin','owner']))
 and (collection<>'backup' or coalesce((select s.uses_puller from public.tm_user_settings s where s.user_id=auth.uid()),false)=false)
 and (public.has_trapmaster_access() or created_by=auth.uid() or public.tm_has_role(array['admin','headadmin','owner']))
);

-- The TrapMasters product entitlement also includes a direct TrapMasters role.
create or replace function public.has_trapmaster_access()
returns boolean language sql stable security definer set search_path = ''
as $$
 select public.is_owner()
 or public.tm_has_role(array['trapmasters','trapcreator'])
 or (auth.uid() is not null
   and not exists(select 1 from public.access_revocations r where r.user_id=auth.uid())
   and (public.has_active_gift()
     or exists(select 1 from public.orders o where (o.user_id=auth.uid() or o.recipient_user_id=auth.uid())
       and (o.user_id=auth.uid() or o.is_gift=true) and o.status='approved'
       and (o.expires_at is null or o.expires_at>now()))
     or exists(select 1 from public.daily_access_grants d where d.user_id=auth.uid() and d.expires_at>now())));
$$;
revoke all on function public.has_trapmaster_access() from public;
grant execute on function public.has_trapmaster_access() to authenticated;

drop policy if exists "TrapMasters submit proposals" on public.trap_proposals;
create policy "TrapMasters submit proposals" on public.trap_proposals for insert to authenticated
with check(user_id=auth.uid() and public.has_trapmaster_access());

drop policy if exists "Staff update collaboration applications" on public.collaboration_applications;
create policy "Staff update collaboration applications" on public.collaboration_applications for update to authenticated
using(public.tm_has_role(array['headadmin','owner']))
with check(public.tm_has_role(array['headadmin','owner']));

drop policy if exists "Staff update trap proposals" on public.trap_proposals;
create policy "Staff update trap proposals" on public.trap_proposals for update to authenticated
using(public.tm_has_role(array['trapcreator','owner']))
with check(public.tm_has_role(array['trapcreator','owner']));

drop policy if exists "Staff update site proposals" on public.site_proposals;
create policy "Staff update site proposals" on public.site_proposals for update to authenticated
using(public.tm_has_role(array['admin','headadmin','owner']))
with check(public.tm_has_role(array['admin','headadmin','owner']));

drop policy if exists "Staff update bug reports" on public.trap_bug_reports;
create policy "Staff update bug reports" on public.trap_bug_reports for update to authenticated
using(public.tm_has_role(array['admin','headadmin','owner']))
with check(public.tm_has_role(array['admin','headadmin','owner']));

commit;
