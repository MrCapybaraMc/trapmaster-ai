create or replace function public.tm_transfer_daily_points_to_nick(p_recipient_nick text, p_amount bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  recipient uuid;
  sender_balance bigint;
  sent_today integer;
  utc_day_start timestamptz;
begin
  if auth.uid() is null then raise exception 'Musisz się zalogować.'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Kwota musi być większa od zera.'; end if;

  select user_id into recipient
  from public.profiles
  where lower(trim(nickname))=lower(trim(coalesce(p_recipient_nick,'')))
  limit 1;

  if recipient is null then raise exception 'Nie znaleziono konta o takim nicku.'; end if;
  if recipient=auth.uid() then raise exception 'Nie możesz przelać punktów samemu sobie.'; end if;

  insert into public.daily_points(user_id,balance)
  values(auth.uid(),0)
  on conflict do nothing;

  select balance into sender_balance
  from public.daily_points
  where user_id=auth.uid()
  for update;

  utc_day_start := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';

  select count(*)::integer into sent_today
  from public.daily_point_transfers
  where sender_id=auth.uid()
    and created_at >= utc_day_start;

  if sent_today >= 2 then
    raise exception 'Wykorzystano dzienny limit 2 przelewów Daily Points. Spróbuj ponownie jutro.';
  end if;

  if p_amount>floor(sender_balance*0.8) then
    raise exception 'Możesz przelać maksymalnie 80%% aktualnego salda.';
  end if;

  update public.daily_points
  set balance=balance-p_amount,updated_at=now()
  where user_id=auth.uid();

  insert into public.daily_points(user_id,balance)
  values(recipient,0)
  on conflict do nothing;

  update public.daily_points
  set balance=balance+p_amount,updated_at=now()
  where user_id=recipient;

  insert into public.daily_point_transfers(sender_id,recipient_id,amount)
  values(auth.uid(),recipient,p_amount);

  insert into public.tm_notifications(user_id,kind,title,body)
  values(recipient,'daily_transfer','Otrzymano Daily Points','Otrzymano przelew punktów od innego użytkownika.');

  return jsonb_build_object('success',true,'sent_today',sent_today+1,'remaining_today',1-sent_today);
end;
$function$;

revoke all on function public.tm_transfer_daily_points_to_nick(text,bigint) from public, anon;
grant execute on function public.tm_transfer_daily_points_to_nick(text,bigint) to authenticated;
