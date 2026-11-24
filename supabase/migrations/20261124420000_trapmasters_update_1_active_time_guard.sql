create or replace function public.tm_log_active_time(p_seconds integer,p_page_path text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
 if auth.uid() is null then return; end if;
 if p_seconds<>60 then raise exception 'Dozwolony jest wyłącznie interwał 60 sekund.'; end if;
 if exists(select 1 from public.tm_active_time where user_id=auth.uid() and occurred_at>now()-interval '55 seconds') then
  return;
 end if;
 insert into public.tm_active_time(user_id,seconds,page_path)
 values(auth.uid(),60,left(coalesce(p_page_path,''),300));
end;
$$;
revoke all on function public.tm_log_active_time(integer,text) from public;
grant execute on function public.tm_log_active_time(integer,text) to authenticated;