create or replace function public.tm_grant_role_by_identifier(p_identifier text,p_role text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare target uuid; identifier text:=trim(coalesce(p_identifier,''));
begin
 if identifier='' then raise exception 'Podaj e-mail lub nick konta.'; end if;
 if position('@' in identifier)>1 then
  select id into target from auth.users where lower(email)=lower(identifier) limit 1;
 else
  select user_id into target from public.profiles where lower(trim(nickname))=lower(identifier) limit 1;
 end if;
 if target is null then raise exception 'Nie znaleziono konta.'; end if;
 perform public.tm_grant_role(target,p_role);
 return true;
end;
$$;
revoke all on function public.tm_grant_role_by_identifier(text,text) from public;
grant execute on function public.tm_grant_role_by_identifier(text,text) to authenticated;

create or replace function public.tm_revoke_role_by_identifier(p_identifier text,p_role text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare target uuid; identifier text:=trim(coalesce(p_identifier,''));
begin
 if identifier='' then raise exception 'Podaj e-mail lub nick konta.'; end if;
 if position('@' in identifier)>1 then
  select id into target from auth.users where lower(email)=lower(identifier) limit 1;
 else
  select user_id into target from public.profiles where lower(trim(nickname))=lower(identifier) limit 1;
 end if;
 if target is null then raise exception 'Nie znaleziono konta.'; end if;
 perform public.tm_revoke_role(target,p_role);
 return true;
end;
$$;
revoke all on function public.tm_revoke_role_by_identifier(text,text) from public;
grant execute on function public.tm_revoke_role_by_identifier(text,text) to authenticated;