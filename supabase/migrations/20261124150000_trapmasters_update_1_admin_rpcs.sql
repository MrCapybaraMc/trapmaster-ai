-- Admin RPCs for the beta multi-role model.
begin;

create or replace function public.tm_grant_role_by_email(p_email text,p_role text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare target uuid; owner_ok boolean; head_ok boolean;
begin
 owner_ok:=public.tm_has_role(array['owner']);
 head_ok:=public.tm_has_role(array['headadmin']);
 if not (owner_ok or head_ok) then raise exception 'Brak uprawnień.'; end if;
 if p_role not in ('admin','headadmin','trapcreator','trapmasters') then raise exception 'Nieprawidłowa ranga.'; end if;
 if head_ok and not owner_ok and p_role not in ('admin','trapcreator','trapmasters') then raise exception 'HeadAdmin nie może nadać tej rangi.'; end if;
 select id into target from auth.users where lower(email)=lower(trim(p_email)) limit 1;
 if target is null then raise exception 'Nie znaleziono konta.'; end if;
 perform public.tm_grant_role(target,p_role);
 return true;
end;
$$;
revoke all on function public.tm_grant_role_by_email(text,text) from public;
grant execute on function public.tm_grant_role_by_email(text,text) to authenticated;

create or replace function public.tm_revoke_role_by_email(p_email text,p_role text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare target uuid;
begin
 if not (public.tm_has_role(array['owner']) or public.tm_has_role(array['headadmin'])) then raise exception 'Brak uprawnień.'; end if;
 select id into target from auth.users where lower(email)=lower(trim(p_email)) limit 1;
 if target is null then raise exception 'Nie znaleziono konta.'; end if;
 perform public.tm_revoke_role(target,p_role);
 return true;
end;
$$;
revoke all on function public.tm_revoke_role_by_email(text,text) from public;
grant execute on function public.tm_revoke_role_by_email(text,text) to authenticated;

create or replace function public.tm_admin_overview()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
 if not (public.tm_has_role(array['admin','headadmin','owner'])) then raise exception 'Brak uprawnień.'; end if;
 select jsonb_build_object(
  'accounts',(select count(*) from auth.users),
  'admins',(select count(distinct user_id) from public.user_roles where role in ('admin','headadmin','owner')),
  'headadmins',(select count(distinct user_id) from public.user_roles where role='headadmin'),
  'trapcreators',(select count(distinct user_id) from public.user_roles where role='trapcreator'),
  'traps',(select count(*) from public.traps),
  'downloads',(select count(*) from public.tm_download_events),
  'open_bug_reports',(select count(*) from public.trap_bug_reports where status='open'),
  'pending_trap_proposals',(select count(*) from public.trap_proposals where status='pending'),
  'pending_collaborations',(select count(*) from public.collaboration_applications where status='pending')
 ) into result;
 return result;
end;
$$;
revoke all on function public.tm_admin_overview() from public;
grant execute on function public.tm_admin_overview() to authenticated;

create or replace function public.tm_list_staff_roles()
returns table(user_id uuid,email text,role text,granted_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if not (public.tm_has_role(array['owner','headadmin'])) then raise exception 'Brak uprawnień.'; end if;
 return query
 select r.user_id,u.email::text,r.role,r.granted_at
 from public.user_roles r join auth.users u on u.id=r.user_id
 order by r.granted_at desc;
end;
$$;
revoke all on function public.tm_list_staff_roles() from public;
grant execute on function public.tm_list_staff_roles() to authenticated;

commit;
