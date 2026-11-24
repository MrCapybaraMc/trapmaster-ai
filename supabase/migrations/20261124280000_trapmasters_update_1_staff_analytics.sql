create or replace function public.tm_staff_activity_overview()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare is_owner boolean:=public.tm_has_role(array['owner']); is_head boolean:=public.tm_has_role(array['headadmin']); result jsonb;
begin
 if not (is_owner or is_head) then raise exception 'Brak uprawnień.'; end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result
 from (
  select u.email::text as email,string_agg(distinct r.role,', ' order by r.role) as roles,
   coalesce((select sum(a.seconds) from public.tm_active_time a where a.user_id=r.user_id),0)::bigint as active_seconds,
   coalesce((select count(*) from public.tm_page_views v where v.user_id=r.user_id),0)::bigint as page_views,
   max(r.granted_at) as role_granted_at
  from public.user_roles r join auth.users u on u.id=r.user_id
  where (is_owner and r.role in ('admin','headadmin')) or (is_head and not is_owner and r.role='admin')
  group by r.user_id,u.email
  order by active_seconds desc
 ) x;
 return result;
end;
$$;
revoke all on function public.tm_staff_activity_overview() from public;
grant execute on function public.tm_staff_activity_overview() to authenticated;