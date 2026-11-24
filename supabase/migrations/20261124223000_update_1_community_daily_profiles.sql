-- TrapMasters Update 1.0 beta: community, Daily, profiles, events and commerce records.
-- Additive only. Commit is on feature/trapmasters-full-beta; do not apply to production.

create table if not exists public.member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  minecraft_name text not null default '',
  bio text not null default '' check (char_length(bio) <= 500),
  socials jsonb not null default '{}'::jsonb,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points bigint not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_transfers (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id),
  recipient_id uuid not null references auth.users(id),
  points integer not null check (points > 0),
  note text not null default '' check (char_length(note) <= 240),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index if not exists daily_transfers_sender_time_idx on public.daily_transfers(sender_id, created_at desc);

create table if not exists public.daily_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null check (char_length(reason) between 1 and 160),
  related_transfer uuid references public.daily_transfers(id),
  created_at timestamptz not null default now()
);

create table if not exists public.creator_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists creator_messages_created_idx on public.creator_messages(created_at desc);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  body text not null default '' check (char_length(body) <= 1000),
  kind text not null default 'general',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists user_notifications_user_time_idx on public.user_notifications(user_id, created_at desc);

create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 140),
  description text not null default '' check (char_length(description) <= 3000),
  starts_at timestamptz not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 140),
  description text not null default '' check (char_length(description) <= 2000),
  image_url text,
  website_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.collaboration_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references auth.users(id) on delete set null,
  applicant_type text not null check (applicant_type in ('creator','project','server')),
  name text not null check (char_length(name) between 1 and 140),
  reason text not null check (char_length(reason) between 5 and 3000),
  platforms text[] not null default '{}',
  audience_size text not null default '',
  contact_email text not null,
  extra_info text not null default '' check (char_length(extra_info) <= 3000),
  status text not null default 'pending' check (status in ('pending','reviewing','accepted','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.member_opinions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.package_gifts (
  id uuid primary key default gen_random_uuid(),
  purchaser_id uuid not null references auth.users(id),
  recipient_minecraft_name text not null,
  extra_message text not null default '' check (char_length(extra_message) <= 500),
  package_code text not null,
  status text not null default 'pending_payment' check (status in ('pending_payment','paid','fulfilled','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent_off integer not null check (percent_off between 1 and 100),
  max_uses integer,
  uses integer not null default 0 check (uses >= 0),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.site_metrics (
  id bigint generated always as identity primary key,
  metric text not null,
  value bigint not null default 0,
  recorded_at timestamptz not null default now()
);

alter table public.member_profiles enable row level security;
alter table public.daily_wallets enable row level security;
alter table public.daily_transfers enable row level security;
alter table public.daily_ledger enable row level security;
alter table public.creator_messages enable row level security;
alter table public.user_notifications enable row level security;
alter table public.site_events enable row level security;
alter table public.partners enable row level security;
alter table public.collaboration_applications enable row level security;
alter table public.member_opinions enable row level security;
alter table public.package_gifts enable row level security;
alter table public.discount_codes enable row level security;
alter table public.site_metrics enable row level security;

drop policy if exists "Profiles readable by everyone" on public.member_profiles;
create policy "Profiles readable by everyone" on public.member_profiles for select to anon, authenticated using (true);
drop policy if exists "Members manage own profile" on public.member_profiles;
create policy "Members manage own profile" on public.member_profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Wallet owner reads wallet" on public.daily_wallets;
create policy "Wallet owner reads wallet" on public.daily_wallets for select to authenticated using (user_id = auth.uid());
drop policy if exists "Ledger owner reads ledger" on public.daily_ledger;
create policy "Ledger owner reads ledger" on public.daily_ledger for select to authenticated using (user_id = auth.uid());
drop policy if exists "Transfer participants read transfers" on public.daily_transfers;
create policy "Transfer participants read transfers" on public.daily_transfers for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "Creator chat visible to TrapCreators" on public.creator_messages;
create policy "Creator chat visible to TrapCreators" on public.creator_messages for select to authenticated using (public.has_account_role('trapcreator'));
drop policy if exists "TrapCreators send chat messages" on public.creator_messages;
create policy "TrapCreators send chat messages" on public.creator_messages for insert to authenticated with check (sender_id = auth.uid() and public.has_account_role('trapcreator'));

drop policy if exists "Members read own notifications" on public.user_notifications;
create policy "Members read own notifications" on public.user_notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "Members update own notifications" on public.user_notifications;
create policy "Members update own notifications" on public.user_notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Events public read" on public.site_events;
create policy "Events public read" on public.site_events for select to anon, authenticated using (true);
drop policy if exists "Partners public read" on public.partners;
create policy "Partners public read" on public.partners for select to anon, authenticated using (true);

drop policy if exists "Applicants submit collaboration" on public.collaboration_applications;
create policy "Applicants submit collaboration" on public.collaboration_applications for insert to authenticated with check (applicant_id = auth.uid());
drop policy if exists "Applicants read own collaboration" on public.collaboration_applications;
create policy "Applicants read own collaboration" on public.collaboration_applications for select to authenticated using (applicant_id = auth.uid());

drop policy if exists "Opinions public read" on public.member_opinions;
create policy "Opinions public read" on public.member_opinions for select to anon, authenticated using (true);
drop policy if exists "Members manage own opinion" on public.member_opinions;
create policy "Members manage own opinion" on public.member_opinions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Purchaser reads own package gifts" on public.package_gifts;
create policy "Purchaser reads own package gifts" on public.package_gifts for select to authenticated using (purchaser_id = auth.uid());
drop policy if exists "Purchaser creates own package gift" on public.package_gifts;
create policy "Purchaser creates own package gift" on public.package_gifts for insert to authenticated with check (purchaser_id = auth.uid());

drop policy if exists "Discounts active public read" on public.discount_codes;
create policy "Discounts active public read" on public.discount_codes for select to anon, authenticated using (active = true and (expires_at is null or expires_at > now()) and (max_uses is null or uses < max_uses));

drop policy if exists "Metrics public read" on public.site_metrics;
create policy "Metrics public read" on public.site_metrics for select to anon, authenticated using (true);

grant select on public.member_profiles, public.site_events, public.partners, public.member_opinions, public.discount_codes, public.site_metrics to anon, authenticated;
grant insert, update on public.member_profiles to authenticated;
grant select on public.daily_wallets, public.daily_transfers, public.daily_ledger, public.creator_messages, public.user_notifications, public.collaboration_applications, public.package_gifts to authenticated;
grant insert on public.creator_messages, public.collaboration_applications, public.package_gifts to authenticated;
grant update on public.user_notifications, public.member_opinions to authenticated;
grant insert, update, delete on public.member_opinions to authenticated;
