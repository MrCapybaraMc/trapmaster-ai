create or replace function public.tm_public_stats()
returns jsonb language sql stable security definer set search_path = ''
as $$
 select jsonb_build_object(
  'total_accounts',(select count(*) from auth.users),
  'site_started_at',(select min(created_at) from auth.users),
  'site_visits',(select count(distinct session_key) from public.tm_page_views),
  'page_views',(select count(*) from public.tm_page_views),
  'active_users_30d',(select count(distinct user_id) from public.tm_page_views where user_id is not null and viewed_at>now()-interval '30 days'),
  'admins',(select count(distinct user_id) from public.user_roles where role in ('admin','headadmin','owner')),
  'headadmins',(select count(distinct user_id) from public.user_roles where role='headadmin'),
  'trapcreators',(select count(distinct user_id) from public.user_roles where role='trapcreator'),
  'traps',(select count(*) from public.traps where published=true)
 );
$$;
revoke all on function public.tm_public_stats() from public;
grant execute on function public.tm_public_stats() to anon,authenticated;

create or replace function public.tm_admin_overview()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
 if not public.tm_has_role(array['admin','headadmin','owner']) then raise exception 'Brak uprawnień.'; end if;
 select jsonb_build_object(
  'accounts',(select count(*) from auth.users),
  'admins',(select count(distinct user_id) from public.user_roles where role in ('admin','headadmin','owner')),
  'headadmins',(select count(distinct user_id) from public.user_roles where role='headadmin'),
  'trapcreators',(select count(distinct user_id) from public.user_roles where role='trapcreator'),
  'traps',(select count(*) from public.traps),
  'downloads',(select count(*) from public.tm_download_events),
  'site_visits',(select count(distinct session_key) from public.tm_page_views),
  'page_views',(select count(*) from public.tm_page_views),
  'tracked_link_clicks',(select count(*) from public.tm_tracked_link_hits),
  'open_bug_reports',(select count(*) from public.trap_bug_reports where status='open'),
  'pending_trap_proposals',(select count(*) from public.trap_proposals where status='pending'),
  'pending_collaborations',(select count(*) from public.collaboration_applications where status='pending')
 ) into result;
 return result;
end;
$$;
revoke all on function public.tm_admin_overview() from public;
grant execute on function public.tm_admin_overview() to authenticated;