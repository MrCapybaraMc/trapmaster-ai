-- Admin replies and first-use review reminders.
begin;
create table if not exists public.tm_admin_replies (
 id uuid primary key default gen_random_uuid(),
 recipient_user_id uuid not null references auth.users(id) on delete cascade,
 staff_user_id uuid not null references auth.users(id),
 subject text not null,
 body text not null,
 created_at timestamptz not null default now()
);
alter table public.tm_admin_replies enable row level security;
create policy "Users read their admin replies" on public.tm_admin_replies for select to authenticated
using(recipient_user_id=auth.uid() or public.tm_has_role(array['admin','headadmin','owner']));

create or replace function public.tm_send_admin_reply(p_recipient_nick text,p_subject text,p_body text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare recipient uuid; reply_id uuid;
begin
 if not public.tm_has_role(array['admin','headadmin','owner']) then raise exception 'Brak uprawnień.'; end if;
 select user_id into recipient from public.profiles
 where lower(trim(nickname))=lower(trim(coalesce(p_recipient_nick,''))) limit 1;
 if recipient is null then raise exception 'Nie znaleziono konta odbiorcy.'; end if;
 if char_length(trim(coalesce(p_subject,'')))<2 or char_length(trim(coalesce(p_body,'')))<2 then
  raise exception 'Temat i treść odpowiedzi są wymagane.';
 end if;
 insert into public.tm_admin_replies(recipient_user_id,staff_user_id,subject,body)
 values(recipient,auth.uid(),left(trim(p_subject),150),left(trim(p_body),4000))
 returning id into reply_id;
 return reply_id;
end;
$$;
revoke all on function public.tm_send_admin_reply(text,text,text) from public;
grant execute on function public.tm_send_admin_reply(text,text,text) to authenticated;

create or replace function public.tm_after_admin_reply()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.tm_notifications(user_id,kind,title,body)
 values(new.recipient_user_id,'admin_reply',new.subject,new.body);
 return new;
end;
$$;
drop trigger if exists tm_admin_reply_notify on public.tm_admin_replies;
create trigger tm_admin_reply_notify after insert on public.tm_admin_replies
for each row execute function public.tm_after_admin_reply();

create or replace function public.tm_after_first_trap_view()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare trap_title text;
begin
 if not exists(select 1 from public.trap_reviews where trap_id=new.trap_id and user_id=new.user_id)
 and not exists(select 1 from public.tm_notifications where user_id=new.user_id and kind='review_reminder' and body like '%'||new.trap_id::text||'%') then
  select title into trap_title from public.traps where id=new.trap_id;
  insert into public.tm_notifications(user_id,kind,title,body,href)
  values(new.user_id,'review_reminder','Oceń trap po wypróbowaniu',
   'Po pierwszym użyciu możesz zostawić ocenę dla trapa: '||coalesce(trap_title,'trap')||' ['||new.trap_id::text||']',
   '/update-1');
 end if;
 return new;
end;
$$;
drop trigger if exists tm_first_trap_view_reminder on public.trap_views;
create trigger tm_first_trap_view_reminder after insert on public.trap_views
for each row execute function public.tm_after_first_trap_view();

commit;