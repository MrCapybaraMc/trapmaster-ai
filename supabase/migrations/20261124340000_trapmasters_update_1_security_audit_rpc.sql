create or replace function public.tm_log_account_security_action(p_target_user_id uuid,p_action text,p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
begin
 if not public.tm_has_role(array['owner']) then raise exception 'Tylko Owner może zarządzać bezpieczeństwem kont.'; end if;
 if p_action not in ('account_locked','account_unlocked','password_reset_requested','forced_reset_requested') then
  raise exception 'Nieprawidłowa operacja audytu.';
 end if;
 insert into public.tm_account_security_audit(target_user_id,actor_user_id,action,details)
 values(p_target_user_id,auth.uid(),p_action,coalesce(p_details,'{}'::jsonb));
end;
$$;
revoke all on function public.tm_log_account_security_action(uuid,text,jsonb) from public;
grant execute on function public.tm_log_account_security_action(uuid,text,jsonb) to authenticated;