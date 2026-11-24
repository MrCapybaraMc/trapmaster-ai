-- TrapMasters Update 1.0: isolated feature tables.
-- This migration is committed to the beta branch only. Do not apply it to production.
-- All tables are additive; existing production tables and functions are not altered.

create table if not exists public.account_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('trapcreator', 'trapmasters')),
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.has_account_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.account_roles r
    where r.user_id = (select auth.uid()) and r.role = p_role
  );
$$;

create or replace function public.can_manage_account_roles()
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select auth.uid() is not null and exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid()) and a.role in ('headadmin', 'owner')
  );
$;

create table if not exists public.traps (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 120),
  description text not null default '',
  game_mode text not null check (game_mode in ('BananaSMP', 'Hoplite', 'Both')),
  trap_type text not null default 'Other',
  armor_types text[] not null default '{}',
  requires_puller boolean not null default false,
  uses_totems boolean not null default false,
  requires_feather_falling boolean not null default false,
  video_url text,
  schematic_url text,
  build_instructions text not null default '',
  extra_video_url text,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists traps_created_at_idx on public.traps (created_at desc);
create index if not exists traps_game_mode_idx on public.traps (game_mode);
create index if not exists traps_type_idx on public.traps (trap_type);

create table if not exists public.trap_reviews (
  id uuid primary key default gen_random_uuid(),
  trap_id uuid not null references public.traps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 10),
  review text not null default '' check (char_length(review) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trap_id, user_id)
);

create table if not exists public.trap_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  trap_id uuid not null references public.traps(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, trap_id)
);

create table if not exists public.trap_bug_reports (
  id uuid primary key default gen_random_uuid(),
  trap_id uuid not null references public.traps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('video', 'schematic', 'instructions', 'other')),
  details text not null check (char_length(trim(details)) between 3 and 2000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.trap_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  youtube_url text,
  description text,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'accepted', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint trap_proposals_has_content check (
    nullif(trim(coalesce(youtube_url, '')), '') is not null
    or nullif(trim(coalesce(description, '')), '') is not null
  )
);

create table if not exists public.website_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 120),
  description text not null check (char_length(trim(description)) between 5 and 3000),
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'accepted', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.account_roles enable row level security;
alter table public.traps enable row level security;
alter table public.trap_reviews enable row level security;
alter table public.trap_favorites enable row level security;
alter table public.trap_bug_reports enable row level security;
alter table public.trap_proposals enable row level security;
alter table public.website_proposals enable row level security;

-- Role grants are private. Only Owner/HeadAdmin may manage TrapCreators and TrapMasters.
drop policy if exists "Users can read their own account roles" on public.account_roles;
create policy "Users can read their own account roles" on public.account_roles
  for select to authenticated using (user_id = auth.uid() or public.can_manage_account_roles());

drop policy if exists "Owner and HeadAdmin manage account roles" on public.account_roles;
create policy "Owner and HeadAdmin manage account roles" on public.account_roles
  for all to authenticated
  using (public.can_manage_account_roles())
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid() and a.role in ('headadmin', 'owner')));

-- Public read access is intentional for the trap catalogue.
drop policy if exists "Anyone can read traps" on public.traps;
create policy "Anyone can read traps" on public.traps
  for select to anon, authenticated using (true);

drop policy if exists "TrapCreators and admins can add traps" on public.traps;
create policy "TrapCreators and admins can add traps" on public.traps
  for insert to authenticated
  with check (created_by = auth.uid() and (
    public.has_account_role('trapcreator') or public.is_admin()
  ));

drop policy if exists "Authors and admins can update traps" on public.traps;
create policy "Authors and admins can update traps" on public.traps
  for update to authenticated
  using ((created_by = auth.uid() and public.has_account_role('trapcreator')) or public.is_admin())
  with check ((created_by = auth.uid() and public.has_account_role('trapcreator')) or public.is_admin());

drop policy if exists "Only admins can delete traps" on public.traps;
create policy "Only admins can delete traps" on public.traps
  for delete to authenticated using (public.is_admin());

drop policy if exists "Anyone can read trap reviews" on public.trap_reviews;
create policy "Anyone can read trap reviews" on public.trap_reviews
  for select to anon, authenticated using (true);

drop policy if exists "Users create their own trap reviews" on public.trap_reviews;
create policy "Users create their own trap reviews" on public.trap_reviews
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Authors edit their own trap reviews" on public.trap_reviews;
create policy "Authors edit their own trap reviews" on public.trap_reviews
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Authors and admins delete trap reviews" on public.trap_reviews;
create policy "Authors and admins delete trap reviews" on public.trap_reviews
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users manage their own trap favorites" on public.trap_favorites;
create policy "Users manage their own trap favorites" on public.trap_favorites
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users create trap bug reports" on public.trap_bug_reports;
create policy "Users create trap bug reports" on public.trap_bug_reports
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users read their trap bug reports" on public.trap_bug_reports;
create policy "Users read their trap bug reports" on public.trap_bug_reports
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage trap bug reports" on public.trap_bug_reports;
create policy "Admins manage trap bug reports" on public.trap_bug_reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "TrapMasters submit trap proposals" on public.trap_proposals;
create policy "TrapMasters submit trap proposals" on public.trap_proposals
  for insert to authenticated with check (user_id = auth.uid() and public.has_account_role('trapmasters'));

drop policy if exists "Authors and staff read trap proposals" on public.trap_proposals;
create policy "Authors and staff read trap proposals" on public.trap_proposals
  for select to authenticated using (user_id = auth.uid() or public.has_account_role('trapcreator') or public.is_admin());

drop policy if exists "Staff review trap proposals" on public.trap_proposals;
create policy "Staff review trap proposals" on public.trap_proposals
  for update to authenticated using (public.has_account_role('trapcreator') or public.is_admin())
  with check (public.has_account_role('trapcreator') or public.is_admin());

drop policy if exists "Authenticated users submit website proposals" on public.website_proposals;
create policy "Authenticated users submit website proposals" on public.website_proposals
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Authors and admins read website proposals" on public.website_proposals;
create policy "Authors and admins read website proposals" on public.website_proposals
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins review website proposals" on public.website_proposals;
create policy "Admins review website proposals" on public.website_proposals
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on function public.has_account_role(text) from public, anon;
grant execute on function public.has_account_role(text) to authenticated;
revoke all on function public.can_manage_account_roles() from public, anon;
grant execute on function public.can_manage_account_roles() to authenticated;

grant select on public.traps, public.trap_reviews to anon, authenticated;
grant insert, update, delete on public.traps to authenticated;
grant select, insert, update, delete on public.trap_reviews to authenticated;
grant select, insert, delete on public.trap_favorites to authenticated;
grant select, insert, update on public.trap_bug_reports to authenticated;
grant select, insert, update on public.trap_proposals to authenticated;
grant select, insert, update on public.website_proposals to authenticated;
grant select, insert, delete on public.account_roles to authenticated;
