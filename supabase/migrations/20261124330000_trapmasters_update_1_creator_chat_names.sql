create or replace function public.tm_creator_chat_history(p_limit integer default 100)
returns table(id bigint,user_id uuid,account_nick text,body text,created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if not public.tm_has_role(array['trapcreator','owner']) then raise exception 'Czat jest dostępny tylko dla TrapCreatorów.'; end if;
 return query
 select m.id,m.user_id,p.nickname::text,m.body,m.created_at
 from public.creator_chat_messages m
 left join public.profiles p on p.user_id=m.user_id
 order by m.created_at asc
 limit greatest(1,least(coalesce(p_limit,100),200));
end;
$$;
revoke all on function public.tm_creator_chat_history(integer) from public;
grant execute on function public.tm_creator_chat_history(integer) to authenticated;