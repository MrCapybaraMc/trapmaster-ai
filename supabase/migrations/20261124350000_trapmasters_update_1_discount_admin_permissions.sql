begin;
drop policy if exists "Admins read discount codes" on public.discount_codes;
create policy "Admins read discount codes" on public.discount_codes for select to authenticated
using(public.tm_has_role(array['admin','headadmin','owner']));

create or replace function public.tm_disable_discount_code(p_code text)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
 if not public.tm_has_role(array['admin','headadmin','owner']) then raise exception 'Brak uprawnień.'; end if;
 update public.discount_codes set active=false,disabled_at=now(),disabled_by=auth.uid()
 where code=upper(trim(coalesce(p_code,''))) and active=true;
 if not found then raise exception 'Kod nie istnieje lub jest już wyłączony.'; end if;
 return true;
end;
$$;
revoke all on function public.tm_disable_discount_code(text) from public;
grant execute on function public.tm_disable_discount_code(text) to authenticated;
commit;