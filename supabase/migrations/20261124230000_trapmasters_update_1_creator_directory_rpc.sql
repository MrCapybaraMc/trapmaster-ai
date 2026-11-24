create or replace function public.tm_creator_directory()
returns table(id uuid,user_id uuid,account_nick text,minecraft_username text,bio text,socials jsonb,avatar_url text,created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
 select c.id,c.user_id,p.nickname::text,c.minecraft_username,c.bio,c.socials,c.avatar_url,c.created_at
 from public.creator_profiles c left join public.profiles p on p.user_id=c.user_id
 order by c.created_at desc;
$$;
revoke all on function public.tm_creator_directory() from public;
grant execute on function public.tm_creator_directory() to anon,authenticated;