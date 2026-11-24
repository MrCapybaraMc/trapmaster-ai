begin;
alter table public.tm_discord_outbox add column if not exists locked_at timestamptz;
create or replace function public.tm_claim_discord_outbox(p_limit integer default 20)
returns table(id bigint,event_type text,payload jsonb,attempts integer)
language plpgsql security definer set search_path = ''
as $$
begin
 return query
 with candidates as (
  select o.id from public.tm_discord_outbox o
  where o.delivered_at is null and o.locked_at is null and o.attempts<8
  order by o.created_at
  for update skip locked
  limit greatest(1,least(coalesce(p_limit,20),100))
 )
 update public.tm_discord_outbox o set locked_at=now()
 from candidates c where o.id=c.id
 returning o.id,o.event_type,o.payload,o.attempts;
end;
$$;
revoke all on function public.tm_claim_discord_outbox(integer) from public;
grant execute on function public.tm_claim_discord_outbox(integer) to service_role;
commit;