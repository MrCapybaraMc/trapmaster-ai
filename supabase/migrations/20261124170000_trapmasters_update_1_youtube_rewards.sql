-- YouTube reward review: issue four package-specific 8% codes for 24 hours after approval.
begin;
create or replace function public.tm_review_youtube_reward(p_submission_id uuid,p_decision text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare item public.tm_youtube_reward_submissions%rowtype; code_prefix text; expiry_time timestamptz; codes text[];
begin
 if not public.tm_has_role(array['admin','headadmin','owner']) then raise exception 'Brak uprawnień.'; end if;
 if p_decision not in ('approved','rejected','manual_review') then raise exception 'Nieprawidłowa decyzja.'; end if;
 select * into item from public.tm_youtube_reward_submissions where id=p_submission_id for update;
 if not found or item.status<>'pending' then raise exception 'Nie znaleziono oczekującego zgłoszenia.'; end if;
 if p_decision<>'approved' then
  update public.tm_youtube_reward_submissions set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now() where id=p_submission_id;
  return jsonb_build_object('success',true,'status',p_decision);
 end if;
 expiry_time:=now()+interval '24 hours';
 code_prefix:='YT'||upper(substr(replace(item.user_id::text,'-',''),1,8));
 codes:=array[code_prefix||'D',code_prefix||'W',code_prefix||'M',code_prefix||'F'];
 insert into public.discount_codes(code,package_type,discount_percent,expires_at,active,created_by)
 values(codes[1],'day',8,expiry_time,true,auth.uid()),
       (codes[2],'week',8,expiry_time,true,auth.uid()),
       (codes[3],'month',8,expiry_time,true,auth.uid()),
       (codes[4],'forever',8,expiry_time,true,auth.uid())
 on conflict(code) do update set active=true,expires_at=excluded.expires_at,discount_percent=8;
 update public.tm_youtube_reward_submissions set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),expires_at=expiry_time where id=p_submission_id;
 insert into public.tm_notifications(user_id,kind,title,body)
 values(item.user_id,'youtube_reward','Nagroda YouTube zatwierdzona',
 'Twoje kody 8% ważne przez 24 godziny: dzień '||codes[1]||', tydzień '||codes[2]||', miesiąc '||codes[3]||', na zawsze '||codes[4]||'.');
 return jsonb_build_object('success',true,'expires_at',expiry_time,'codes',codes);
end;
$$;
revoke all on function public.tm_review_youtube_reward(uuid,text) from public;
grant execute on function public.tm_review_youtube_reward(uuid,text) to authenticated;
commit;
