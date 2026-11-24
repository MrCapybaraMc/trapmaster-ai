-- TrapMasters Update 1.0 foundation.
-- Apply ONLY to a dedicated beta Supabase project after reviewing this migration.
-- Never run this against the production database.
begin;

create extension if not exists pgcrypto;

-- Multiple roles per account. Preserve legacy admin_users as a compatibility source.
create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','headadmin','admin','trapcreator','trapmasters')),
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
alter table public.user_roles enable row level security;

insert into public.user_roles(user_id, role)
select user_id, case role when 'owner' then 'owner' when 'headadmin' then 'headadmin' else 'admin' end
from public.admin_users
on conflict do nothing;

create or replace function public.tm_has_role(p_roles text[])
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid()) and r.role = any(p_roles)
  );
$$;
revoke all on function public.tm_has_role(text[]) from public;
grant execute on function public.tm_has_role(text[]) to authenticated;

create or replace function public.tm_grant_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = ''
as $$
declare actor_roles text[];
begin
  if auth.uid() is null then raise exception 'Musisz się zalogować.'; end if;
  if p_role not in ('owner','headadmin','admin','trapcreator','trapmasters') then
    raise exception 'Nieprawidłowa ranga.';
  end if;
  select array_agg(role) into actor_roles from public.user_roles where user_id=auth.uid();
  if coalesce(actor_roles, '{}'::text[]) @> array['owner'] then
    if p_role='owner' then raise exception 'Nie można nadawać rangi Owner.'; end if;
  elsif coalesce(actor_roles, '{}'::text[]) @> array['headadmin'] then
    if p_role not in ('admin','trapcreator','trapmasters') then raise exception 'HeadAdmin nie może nadać tej rangi.'; end if;
  else raise exception 'Brak uprawnień.'; end if;

  insert into public.user_roles(user_id,role,granted_by)
  values(p_user_id,p_role,auth.uid()) on conflict do nothing;

  if p_role='trapcreator' then
    insert into public.creator_profiles(user_id) values(p_user_id) on conflict(user_id) do nothing;
    insert into public.user_roles(user_id,role,granted_by)
    values(p_user_id,'trapmasters',auth.uid()) on conflict do nothing;
  end if;
end;
$$;

create or replace function public.tm_revoke_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = ''
as $$
declare actor_owner boolean; actor_head boolean;
begin
  actor_owner := public.tm_has_role(array['owner']);
  actor_head := public.tm_has_role(array['headadmin']);
  if not (actor_owner or actor_head) then raise exception 'Brak uprawnień.'; end if;
  if p_role='owner' or p_user_id=auth.uid() then raise exception 'Tej rangi nie można odebrać.'; end if;
  if actor_head and not actor_owner and p_role <> 'admin' then
    raise exception 'HeadAdmin może odbierać wyłącznie rangę Admin.';
  end if;
  if not actor_owner and p_role in ('headadmin','trapcreator','trapmasters') then
    raise exception 'Tylko Owner może odebrać tę rangę.';
  end if;
  delete from public.user_roles where user_id=p_user_id and role=p_role;
  if p_role='trapcreator' then
    delete from public.user_roles where user_id=p_user_id and role='trapmasters';
  end if;
end;
$$;
revoke all on function public.tm_grant_role(uuid,text) from public;
revoke all on function public.tm_revoke_role(uuid,text) from public;
grant execute on function public.tm_grant_role(uuid,text) to authenticated;
grant execute on function public.tm_revoke_role(uuid,text) to authenticated;

create table if not exists public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  minecraft_username text,
  bio text not null default '',
  socials jsonb not null default '{}'::jsonb,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.creator_profiles enable row level security;
drop policy if exists "Creator profiles are public" on public.creator_profiles;
create policy "Creator profiles are public" on public.creator_profiles for select to anon,authenticated using (true);
drop policy if exists "Creators edit own profile" on public.creator_profiles;
create policy "Creators edit own profile" on public.creator_profiles for update to authenticated
using (user_id=auth.uid() or public.tm_has_role(array['owner']))
with check (user_id=auth.uid() or public.tm_has_role(array['owner']));

create table if not exists public.traps (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 3 and 120),
 summary text not null default '',
 description text not null default '',
 video_url text,
 schematic_url text,
 instructions text not null default '',
 armor_types text[] not null default '{}',
 puller boolean not null default false,
 totems boolean not null default false,
 feather_falling boolean not null default false,
 servers text[] not null default '{}',
 trap_type text not null default 'standard',
 collection text not null default 'traps' check(collection in ('traps','library','backup')),
 backup_requires_no_puller boolean not null default true,
 created_by uuid not null references auth.users(id),
 updated_by uuid references auth.users(id),
 published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.traps enable row level security;
create index if not exists traps_collection_published_idx on public.traps(collection,published,created_at desc);
drop policy if exists "Published traps readable" on public.traps;
create policy "Published traps readable" on public.traps for select to authenticated
using (published=true or created_by=auth.uid() or public.tm_has_role(array['admin','headadmin','owner']));
drop policy if exists "Trap creators insert traps" on public.traps;
create policy "Trap creators insert traps" on public.traps for insert to authenticated
with check (created_by=auth.uid() and public.tm_has_role(array['trapcreator','admin','headadmin','owner']));
drop policy if exists "Owners edit traps" on public.traps;
create policy "Owners edit traps" on public.traps for update to authenticated
using ((created_by=auth.uid() and public.tm_has_role(array['trapcreator'])) or public.tm_has_role(array['admin','headadmin','owner']))
with check ((created_by=auth.uid() and public.tm_has_role(array['trapcreator'])) or public.tm_has_role(array['admin','headadmin','owner']));
drop policy if exists "Admins delete traps" on public.traps;
create policy "Admins delete traps" on public.traps for delete to authenticated
using (public.tm_has_role(array['admin','headadmin','owner']));

create table if not exists public.trap_reviews (
 id uuid primary key default gen_random_uuid(),
 trap_id uuid not null references public.traps(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 rating int not null check(rating between 1 and 10),
 body text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(trap_id,user_id)
);
alter table public.trap_reviews enable row level security;
create policy "Reviews readable" on public.trap_reviews for select to authenticated using(true);
create policy "Users manage own reviews" on public.trap_reviews for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());

create table if not exists public.trap_favorites (
 user_id uuid not null references auth.users(id) on delete cascade,
 trap_id uuid not null references public.traps(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,trap_id)
);
alter table public.trap_favorites enable row level security;
create policy "Users manage own favorites" on public.trap_favorites for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());

create table if not exists public.trap_views (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 trap_id uuid not null references public.traps(id) on delete cascade,
 viewed_at timestamptz not null default now()
);
alter table public.trap_views enable row level security;
create policy "Users read own views" on public.trap_views for select to authenticated using(user_id=auth.uid());
create policy "Users add own views" on public.trap_views for insert to authenticated with check(user_id=auth.uid());

create table if not exists public.trap_bug_reports (
 id uuid primary key default gen_random_uuid(),
 trap_id uuid references public.traps(id) on delete set null,
 user_id uuid not null references auth.users(id) on delete cascade,
 category text not null check(category in ('schematic','video','instructions','other')),
 details text not null,
 status text not null default 'open' check(status in ('open','in_progress','resolved','rejected')),
 created_at timestamptz not null default now()
);
alter table public.trap_bug_reports enable row level security;
create policy "Users submit bug reports" on public.trap_bug_reports for insert to authenticated with check(user_id=auth.uid());
create policy "Users and staff read bug reports" on public.trap_bug_reports for select to authenticated
using(user_id=auth.uid() or public.tm_has_role(array['admin','headadmin','owner']));

create table if not exists public.trap_proposals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 youtube_url text,
 description text not null default '',
 status text not null default 'pending' check(status in ('pending','accepted','rejected')),
 created_at timestamptz not null default now()
);
alter table public.trap_proposals enable row level security;
create policy "TrapMasters submit proposals" on public.trap_proposals for insert to authenticated
with check(user_id=auth.uid() and public.tm_has_role(array['trapmasters','trapcreator','admin','headadmin','owner']));
create policy "Proposal owners and staff read" on public.trap_proposals for select to authenticated
using(user_id=auth.uid() or public.tm_has_role(array['trapcreator','owner']));

create table if not exists public.site_proposals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 description text not null,
 status text not null default 'pending' check(status in ('pending','reviewing','accepted','rejected')),
 created_at timestamptz not null default now()
);
alter table public.site_proposals enable row level security;
create policy "Users submit site proposals" on public.site_proposals for insert to authenticated with check(user_id=auth.uid());
create policy "Staff read site proposals" on public.site_proposals for select to authenticated
using(user_id=auth.uid() or public.tm_has_role(array['admin','headadmin','owner']));

create table if not exists public.tm_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null,
 title text not null,
 body text not null default '',
 href text,
 read_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.tm_notifications enable row level security;
create policy "Users manage own notifications" on public.tm_notifications for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());

create table if not exists public.creator_chat_messages (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 4000),
 created_at timestamptz not null default now()
);
alter table public.creator_chat_messages enable row level security;
create policy "Creators read chat" on public.creator_chat_messages for select to authenticated
using(public.tm_has_role(array['trapcreator','owner']));
create policy "Creators post chat" on public.creator_chat_messages for insert to authenticated
with check(user_id=auth.uid() and public.tm_has_role(array['trapcreator','owner']));

create table if not exists public.daily_points (
 user_id uuid primary key references auth.users(id) on delete cascade,
 balance bigint not null default 0 check(balance>=0),
 updated_at timestamptz not null default now()
);
alter table public.daily_points enable row level security;
create policy "Users read own daily balance" on public.daily_points for select to authenticated
using(user_id=auth.uid() or public.tm_has_role(array['owner']));

create table if not exists public.daily_point_transfers (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id),
 recipient_id uuid not null references auth.users(id),
 amount bigint not null check(amount>0),
 created_at timestamptz not null default now(),
 check(sender_id<>recipient_id)
);
alter table public.daily_point_transfers enable row level security;
create policy "Users read own transfers" on public.daily_point_transfers for select to authenticated
using(sender_id=auth.uid() or recipient_id=auth.uid());

create or replace function public.tm_transfer_daily_points(p_recipient uuid,p_amount bigint)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare current_balance bigint; last_transfer timestamptz; recipient_balance bigint;
begin
 if auth.uid() is null then raise exception 'Musisz się zalogować.'; end if;
 if p_recipient=auth.uid() or p_amount<=0 then raise exception 'Nieprawidłowy przelew.'; end if;
 insert into public.daily_points(user_id,balance) values(auth.uid(),0) on conflict do nothing;
 select balance into current_balance from public.daily_points where user_id=auth.uid() for update;
 if p_amount > floor(current_balance*0.8) then raise exception 'Możesz przelać maksymalnie 80%% salda.'; end if;
 select max(created_at) into last_transfer from public.daily_point_transfers where sender_id=auth.uid();
 if last_transfer is not null and last_transfer > now()-interval '2 days' then
   raise exception 'Kolejny przelew będzie możliwy po upływie 2 dni.';
 end if;
 update public.daily_points set balance=balance-p_amount where user_id=auth.uid();
 insert into public.daily_points(user_id,balance) values(p_recipient,0) on conflict do nothing;
 update public.daily_points set balance=balance+p_amount where user_id=p_recipient returning balance into recipient_balance;
 insert into public.daily_point_transfers(sender_id,recipient_id,amount) values(auth.uid(),p_recipient,p_amount);
 return recipient_balance;
end;
$$;
revoke all on function public.tm_transfer_daily_points(uuid,bigint) from public;
grant execute on function public.tm_transfer_daily_points(uuid,bigint) to authenticated;

create table if not exists public.tm_achievements (
 id text primary key,
 title text not null,
 description text not null,
 points bigint not null default 0
);
create table if not exists public.user_achievements (
 user_id uuid not null references auth.users(id) on delete cascade,
 achievement_id text not null references public.tm_achievements(id) on delete cascade,
 earned_at timestamptz not null default now(),
 primary key(user_id,achievement_id)
);
alter table public.user_achievements enable row level security;
create policy "Achievements are public" on public.user_achievements for select to authenticated using(true);

create table if not exists public.tm_events (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 description text not null default '',
 starts_at timestamptz not null,
 active boolean not null default true,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.tm_events enable row level security;
create policy "Active events readable" on public.tm_events for select to anon,authenticated using(active);
create policy "Staff manage events" on public.tm_events for all to authenticated
using(public.tm_has_role(array['headadmin','owner'])) with check(public.tm_has_role(array['headadmin','owner']));

create table if not exists public.tm_partners (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 description text not null default '',
 image_url text,
 website_url text,
 active boolean not null default true,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.tm_partners enable row level security;
create policy "Active partners readable" on public.tm_partners for select to anon,authenticated using(active);
create policy "Staff manage partners" on public.tm_partners for all to authenticated
using(public.tm_has_role(array['headadmin','owner'])) with check(public.tm_has_role(array['headadmin','owner']));

create table if not exists public.collaboration_applications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 applicant_type text not null,
 reason text not null,
 platforms text[] not null default '{}',
 audience_size text,
 contact_email text not null,
 extra_info text not null default '',
 status text not null default 'pending' check(status in ('pending','reviewing','accepted','rejected')),
 created_at timestamptz not null default now()
);
alter table public.collaboration_applications enable row level security;
create policy "Users submit collaboration applications" on public.collaboration_applications for insert to authenticated
with check(user_id=auth.uid());
create policy "Applicant and staff read collaborations" on public.collaboration_applications for select to authenticated
using(user_id=auth.uid() or public.tm_has_role(array['headadmin','owner']));

create table if not exists public.tm_tracked_links (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique,
 destination_url text not null,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.tm_tracked_link_hits (
 id bigint generated always as identity primary key,
 link_id uuid not null references public.tm_tracked_links(id) on delete cascade,
 visited_at timestamptz not null default now()
);
alter table public.tm_tracked_links enable row level security;
alter table public.tm_tracked_link_hits enable row level security;
create policy "Owner manages tracked links" on public.tm_tracked_links for all to authenticated
using(public.tm_has_role(array['owner'])) with check(public.tm_has_role(array['owner']));

create table if not exists public.tm_opinions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(body) between 3 and 3000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.tm_opinions enable row level security;
create policy "Opinions readable" on public.tm_opinions for select to anon,authenticated using(true);
create policy "Subscribers create opinions" on public.tm_opinions for insert to authenticated
with check(user_id=auth.uid() and public.has_trapmaster_access());
create policy "Authors edit opinions while subscribed" on public.tm_opinions for update to authenticated
using(user_id=auth.uid() and public.has_trapmaster_access())
with check(user_id=auth.uid() and public.has_trapmaster_access());

create table if not exists public.tm_supercombo_codes (
 code text primary key,
 expires_at timestamptz,
 max_uses integer,
 uses integer not null default 0,
 rewards jsonb not null default '[]'::jsonb,
 active boolean not null default true,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 check(max_uses is null or max_uses>0)
);
create table if not exists public.tm_supercombo_redemptions (
 id uuid primary key default gen_random_uuid(),
 code text not null references public.tm_supercombo_codes(code),
 user_id uuid not null references auth.users(id),
 redeemed_at timestamptz not null default now(),
 unique(code,user_id)
);
alter table public.tm_supercombo_codes enable row level security;
alter table public.tm_supercombo_redemptions enable row level security;
create policy "Owner manages supercombo" on public.tm_supercombo_codes for all to authenticated
using(public.tm_has_role(array['owner'])) with check(public.tm_has_role(array['owner']));
create policy "Users see own redemptions" on public.tm_supercombo_redemptions for select to authenticated using(user_id=auth.uid());

create table if not exists public.tm_account_security_audit (
 id bigint generated always as identity primary key,
 target_user_id uuid references auth.users(id) on delete set null,
 actor_user_id uuid references auth.users(id) on delete set null,
 action text not null,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.tm_account_security_audit enable row level security;
create policy "Owner reads security audit" on public.tm_account_security_audit for select to authenticated
using(public.tm_has_role(array['owner']));

-- Passwords are intentionally not exposed. Authentication provider manages password hashes/resets.
commit;
