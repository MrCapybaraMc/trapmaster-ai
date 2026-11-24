-- Restrict download accounting to the verified, entitlement-checked RPC.
begin;
revoke insert on public.tm_download_events from anon,authenticated;

create or replace function public.tm_record_trap_download(p_trap_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare can_use_backup boolean;
begin
 if auth.uid() is null then raise exception 'Musisz się zalogować.'; end if;
 if not public.has_trapmaster_access() then raise exception 'Aktywny dostęp TrapMasters jest wymagany.'; end if;
 select coalesce(s.uses_puller,false)=false into can_use_backup
 from (select 1) seed left join public.tm_user_settings s on s.user_id=auth.uid();
 if not exists(
  select 1 from public.traps t where t.id=p_trap_id and t.published=true
   and (t.collection<>'backup' or coalesce(can_use_backup,true))
 ) then raise exception 'Nie znaleziono dostępnego trapa lub backupu.'; end if;
 insert into public.tm_download_events(user_id,trap_id) values(auth.uid(),p_trap_id);
 insert into public.trap_views(user_id,trap_id) values(auth.uid(),p_trap_id);
end;
$$;
revoke all on function public.tm_record_trap_download(uuid) from public;
grant execute on function public.tm_record_trap_download(uuid) to authenticated;
commit;