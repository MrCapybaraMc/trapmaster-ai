-- TrapCreator directory and Owner-managed profile creation.
begin;
drop policy if exists "Owner creates creator profiles" on public.creator_profiles;
create policy "Owner creates creator profiles" on public.creator_profiles for insert to authenticated
with check(public.tm_has_role(array['owner']));

create or replace function public.tm_upsert_creator_profile_by_nick(
 p_account_nick text,p_minecraft_username text,p_bio text default '',p_socials jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare target uuid; profile_id uuid;
begin
 if not public.tm_has_role(array['owner']) then raise exception 'Tylko Owner może ręcznie tworzyć profile.'; end if;
 select user_id into target from public.profiles
 where lower(trim(nickname))=lower(trim(coalesce(p_account_nick,''))) limit 1;
 if target is null then raise exception 'Nie znaleziono konta o podanym nicku.'; end if;
 insert into public.creator_profiles(user_id,minecraft_username,bio,socials)
 values(target,nullif(trim(p_minecraft_username),''),coalesce(p_bio,''),coalesce(p_socials,'{}'::jsonb))
 on conflict(user_id) do update set minecraft_username=excluded.minecraft_username,bio=excluded.bio,socials=excluded.socials,updated_at=now()
 returning id into profile_id;
 return profile_id;
end;
$$;
revoke all on function public.tm_upsert_creator_profile_by_nick(text,text,text,jsonb) from public;
grant execute on function public.tm_upsert_creator_profile_by_nick(text,text,text,jsonb) to authenticated;
commit;