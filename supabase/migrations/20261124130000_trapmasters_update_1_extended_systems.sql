-- TrapMasters Update 1.0: remaining beta-only systems.
-- This migration is additive and must be applied only to a dedicated beta Supabase project.
begin;

create table if not exists public.tm_user_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 language text not null default 'pl' check(language in ('pl','en')),
 videos_muted boolean not null default true,
 updated_at timestamptz not null default now()
);
alter table public.tm_user_settings enable row level security;
drop policy if exists "Users manage own TM settings" on public.tm_user_settings;
create policy "Users manage own TM settings" on public.tm_user_settings for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());

create table if not exists public.tm_announcements (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 body text not null,
 active boolean not null default true,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.tm_announcements enable row level security;
create policy "Active announcements public" on public.tm_announcements for select to anon,authenticated using(active);
create policy "Owner manages announcements" on public.tm_announcements for all to authenticated
using(public.tm_has_role(array['owner'])) with check(public.tm_has_role(array['owner']));

create table if not exists public.tm_event_dismissals (
 event_id uuid not null references public.tm_events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 dismissed_at timestamptz not null default now(),
 primary key(event_id,user_id)
);
alter table public.tm_event_dismissals enable row level security;
create policy "Users manage own event dismissals" on public.tm_event_dismissals for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());

create table if not exists public.tm_discount_usage (
 id uuid primary key default gen_random_uuid(),
 code text not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 order_id uuid,
 discount_percent numeric(5,2) not null check(discount_percent between 0 and 100),
 used_at timestamptz not null default now()
);
alter table public.tm_discount_usage enable row level security;
create policy "Users read own discount usage" on public.tm_discount_usage for select to authenticated
using(user_id=auth.uid() or public.tm_has_role(array['admin','headadmin','owner']));

create table if not exists public.tm_youtube_reward_submissions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 proof_url text not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected','manual_review')),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 expires_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.tm_youtube_reward_submissions enable row level security;
create policy "Users submit and read own youtube proofs" on public.tm_youtube_reward_submissions for select to authenticated
using(user_id=auth.uid() or public.tm_has_role(array['admin','headadmin','owner']));
create policy "Users submit youtube proof" on public.tm_youtube_reward_submissions for insert to authenticated
with check(user_id=auth.uid());
create policy "Staff review youtube proof" on public.tm_youtube_reward_submissions for update to authenticated
using(public.tm_has_role(array['admin','headadmin','owner']))
with check(public.tm_has_role(array['admin','headadmin','owner']));

create table if not exists public.tm_admin_activity (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 activity text not null,
 occurred_at timestamptz not null default now()
);
alter table public.tm_admin_activity enable row level security;
create policy "Owner reads admin activity" on public.tm_admin_activity for select to authenticated
using(public.tm_has_role(array['owner']));
create policy "Staff logs own activity" on public.tm_admin_activity for insert to authenticated
with check(user_id=auth.uid() and public.tm_has_role(array['admin','headadmin','owner']));

create table if not exists public.tm_page_views (
 id bigint generated always as identity primary key,
 user_id uuid references auth.users(id) on delete set null,
 session_key text,
 page_path text not null,
 viewed_at timestamptz not null default now()
);
alter table public.tm_page_views enable row level security;
create policy "Owner reads page analytics" on public.tm_page_views for select to authenticated
using(public.tm_has_role(array['owner']));
create policy "Authenticated users record own page views" on public.tm_page_views for insert to authenticated
with check(user_id=auth.uid());

create table if not exists public.tm_search_events (
 id bigint generated always as identity primary key,
 user_id uuid references auth.users(id) on delete set null,
 search_term text not null,
 created_at timestamptz not null default now()
);
alter table public.tm_search_events enable row level security;
create policy "Owner reads search analytics" on public.tm_search_events for select to authenticated
using(public.tm_has_role(array['owner']));
create policy "Users record own searches" on public.tm_search_events for insert to authenticated
with check(user_id=auth.uid());

create table if not exists public.tm_download_events (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 trap_id uuid not null references public.traps(id) on delete cascade,
 downloaded_at timestamptz not null default now()
);
alter table public.tm_download_events enable row level security;
create policy "Users read own download history" on public.tm_download_events for select to authenticated
using(user_id=auth.uid() or public.tm_has_role(array['owner']));
create policy "Users record own downloads" on public.tm_download_events for insert to authenticated
with check(user_id=auth.uid());

create table if not exists public.tm_supercombo_audit (
 id bigint generated always as identity primary key,
 code text not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 reward_snapshot jsonb not null,
 redeemed_at timestamptz not null default now()
);
alter table public.tm_supercombo_audit enable row level security;
create policy "Owner reads supercombo audit" on public.tm_supercombo_audit for select to authenticated
using(public.tm_has_role(array['owner']));
create policy "Users read own supercombo audit" on public.tm_supercombo_audit for select to authenticated
using(user_id=auth.uid());

create table if not exists public.tm_collaboration_notes (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references public.collaboration_applications(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 note text not null,
 created_at timestamptz not null default now()
);
alter table public.tm_collaboration_notes enable row level security;
create policy "Owner and HeadAdmin manage collaboration notes" on public.tm_collaboration_notes for all to authenticated
using(public.tm_has_role(array['owner','headadmin'])) with check(public.tm_has_role(array['owner','headadmin']));

-- Extend orders for account-to-account package gifts without changing existing buyer/order fields.
alter table public.orders add column if not exists recipient_user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists recipient_minecraft_nick text;
alter table public.orders add column if not exists buyer_message text;
alter table public.orders add column if not exists is_gift boolean not null default false;
create index if not exists orders_recipient_user_idx on public.orders(recipient_user_id);

-- Owner-managed configurable prices and Pay page recipient; no secrets are stored here.
create table if not exists public.tm_store_settings (
 id boolean primary key default true check(id),
 minecraft_payment_recipient text not null default '',
 package_prices jsonb not null default '{"day":2,"week":5,"month":12,"forever":28}'::jsonb,
 donation_minimum numeric(10,2) not null default 0 check(donation_minimum>=0),
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.tm_store_settings enable row level security;
create policy "Public reads store settings" on public.tm_store_settings for select to anon,authenticated using(true);
create policy "Owner updates store settings" on public.tm_store_settings for all to authenticated
using(public.tm_has_role(array['owner'])) with check(public.tm_has_role(array['owner']));
insert into public.tm_store_settings(id) values(true) on conflict(id) do nothing;

-- A recipient only gets access from a paid/approved gift order.
create or replace function public.tm_has_gifted_access()
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists(select 1 from public.orders o where o.recipient_user_id=(select auth.uid())
   and o.is_gift=true and o.status='approved'
   and (o.expires_at is null or o.expires_at>now()));
$$;
revoke all on function public.tm_has_gifted_access() from public;
grant execute on function public.tm_has_gifted_access() to authenticated;

-- Redemption is transactional and enforces expiry and use caps.
create or replace function public.tm_redeem_supercombo(p_code text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare c public.tm_supercombo_codes%rowtype;
begin
 if auth.uid() is null then raise exception 'Musisz się zalogować.'; end if;
 select * into c from public.tm_supercombo_codes
 where code=upper(trim(coalesce(p_code,''))) and active=true
 and (expires_at is null or expires_at>now())
 for update;
 if not found then raise exception 'Kod jest nieprawidłowy lub wygasł.'; end if;
 if c.max_uses is not null and c.uses>=c.max_uses then raise exception 'Limit użyć kodu został osiągnięty.'; end if;
 insert into public.tm_supercombo_redemptions(code,user_id) values(c.code,auth.uid());
 update public.tm_supercombo_codes set uses=uses+1 where code=c.code;
 insert into public.tm_supercombo_audit(code,user_id,reward_snapshot) values(c.code,auth.uid(),c.rewards);
 return jsonb_build_object('success',true,'rewards',c.rewards);
exception when unique_violation then
 raise exception 'Ten kod został już wykorzystany na tym koncie.';
end;
$$;
revoke all on function public.tm_redeem_supercombo(text) from public;
grant execute on function public.tm_redeem_supercombo(text) to authenticated;

-- Notification fan-out helpers. Only trusted database functions/service role should create notifications.
create or replace function public.tm_notify_roles(p_roles text[],p_kind text,p_title text,p_body text,p_href text default null)
returns integer language plpgsql security definer set search_path = ''
as $$
declare inserted_count integer;
begin
 if auth.uid() is not null and not public.tm_has_role(array['admin','headadmin','owner','trapcreator']) then
   raise exception 'Brak uprawnień do wysyłania powiadomień grupowych.';
 end if;
 insert into public.tm_notifications(user_id,kind,title,body,href)
 select distinct user_id,p_kind,p_title,p_body,p_href
 from public.user_roles where role=any(p_roles);
 get diagnostics inserted_count=row_count;
 return inserted_count;
end;
$$;
revoke all on function public.tm_notify_roles(text[],text,text,text,text) from public;
grant execute on function public.tm_notify_roles(text[],text,text,text,text) to authenticated;

-- Profile auto-creation on TrapCreator grant; profile is editable by the creator and Owner only.
drop policy if exists "Creators edit own profile" on public.creator_profiles;
create policy "Creators edit own profile" on public.creator_profiles for update to authenticated
using ((user_id=auth.uid() and public.tm_has_role(array['trapcreator'])) or public.tm_has_role(array['owner']))
with check ((user_id=auth.uid() and public.tm_has_role(array['trapcreator'])) or public.tm_has_role(array['owner']));

-- Allow gifted subscribers through the existing entitlement function.
create or replace function public.has_trapmaster_access()
returns boolean language sql stable security definer set search_path = ''
as $$
 select public.is_owner()
 or (auth.uid() is not null
   and not exists(select 1 from public.access_revocations r where r.user_id=auth.uid())
   and (public.has_active_gift()
     or exists(select 1 from public.orders o where (o.user_id=auth.uid() or o.recipient_user_id=auth.uid())
       and (o.user_id=auth.uid() or o.is_gift=true) and o.status='approved'
       and (o.expires_at is null or o.expires_at>now()))
     or exists(select 1 from public.daily_access_grants d where d.user_id=auth.uid() and d.expires_at>now())));
$$;
revoke all on function public.has_trapmaster_access() from public;
grant execute on function public.has_trapmaster_access() to authenticated;

commit;
