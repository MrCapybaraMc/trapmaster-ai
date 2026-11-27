begin;

-- Library access is limited to Trap Creator, active TrapMasters package holders,
-- HeadAdmin, and Owner. A normal Admin role alone does not grant library access.
create or replace function public.has_trapmaster_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and (
      public.tm_has_role(array['trapcreator','headadmin','owner','trapmasters'])
      or (
        not exists (
          select 1 from public.access_revocations r
          where r.user_id = auth.uid()
        )
        and (
          public.has_active_gift()
          or exists (
            select 1
            from public.orders o
            where (
              (o.user_id = auth.uid() and coalesce(o.is_gift,false) = false)
              or (o.recipient_user_id = auth.uid() and o.is_gift = true)
            )
              and o.status = 'approved'
              and (o.expires_at is null or o.expires_at > now())
          )
          or exists (
            select 1 from public.daily_access_grants d
            where d.user_id = auth.uid() and d.expires_at > now()
          )
        )
      )
    );
$$;

revoke all on function public.has_trapmaster_access() from public, anon;
grant execute on function public.has_trapmaster_access() to authenticated;

-- Remove the prior created_by bypass: even a creator must have an allowed
-- entitlement to read the catalogue.
drop policy if exists "Entitled users read traps" on public.traps;
create policy "Entitled users read traps"
on public.traps
for select
to authenticated
using (
  public.has_trapmaster_access()
  and (
    collection <> 'backup'
    or coalesce(
      (select s.uses_puller
       from public.tm_user_settings s
       where s.user_id = auth.uid()),
      false
    ) = false
  )
);

commit;
