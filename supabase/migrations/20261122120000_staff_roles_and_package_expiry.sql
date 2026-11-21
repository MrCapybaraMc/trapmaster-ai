-- Production-safe authorization and entitlement refinements.
-- The production project already has public.set_order_access_period() and
-- set_order_access_period_trigger on public.orders. Keep that established
-- trigger as the single source of truth for approved/rejected order expiry.

create or replace function public.set_staff_role(p_user_id uuid, p_role text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text;
  v_target_role text;
begin
  if auth.uid() is null then
    raise exception 'Musisz się zalogować.';
  end if;

  select role into v_actor_role
  from public.admin_users
  where user_id = auth.uid();

  select role into v_target_role
  from public.admin_users
  where user_id = p_user_id;

  if v_target_role is null then
    raise exception 'Nie znaleziono konta w administracji.';
  end if;
  if v_target_role = 'owner' then
    raise exception 'Nie można zmieniać rangi Ownera.';
  end if;

  if v_actor_role = 'owner' then
    if p_role not in ('admin', 'headadmin') then
      raise exception 'Nieprawidłowa ranga.';
    end if;
  elsif v_actor_role = 'headadmin' then
    if p_role <> 'admin' or v_target_role <> 'admin' then
      raise exception 'HeadAdmin może zarządzać wyłącznie rangą zwykłego Admina.';
    end if;
  else
    raise exception 'Brak uprawnień do zarządzania rangami.';
  end if;

  update public.admin_users
  set role = p_role
  where user_id = p_user_id;

  return true;
end;
$$;

revoke all on function public.set_staff_role(uuid, text) from public;
grant execute on function public.set_staff_role(uuid, text) to authenticated;

-- A confirmed application grants the regular Admin role.
-- Existing Owner/HeadAdmin roles are never downgraded.
create or replace function public.review_admin_application(p_application_id uuid, p_decision text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app public.recruitment_applications%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role in ('headadmin', 'owner')
  ) then
    raise exception 'Tylko HeadAdmin lub Owner może rozpatrywać podania.';
  end if;

  if p_decision not in ('accepted', 'rejected') then
    raise exception 'Nieprawidłowa decyzja.';
  end if;

  select * into v_app
  from public.recruitment_applications
  where id = p_application_id
  for update;

  if not found then raise exception 'Nie znaleziono podania.'; end if;
  if v_app.status <> 'pending' then
    raise exception 'To podanie zostało już rozpatrzone.';
  end if;

  update public.recruitment_applications
  set status = p_decision
  where id = p_application_id;

  if p_decision = 'accepted' then
    insert into public.admin_users(user_id, role)
    values (v_app.user_id, 'admin')
    on conflict (user_id) do update
      set role = 'admin'
      where public.admin_users.role = 'admin';
  end if;

  return jsonb_build_object('success', true, 'status', p_decision, 'granted_role',
    case when p_decision = 'accepted' then 'admin' else null end);
end;
$$;

revoke all on function public.review_admin_application(uuid, text) from public;
grant execute on function public.review_admin_application(uuid, text) to authenticated;

-- No additional orders trigger is created here. The existing production
-- set_order_access_period_trigger already sets approved_at/expires_at for
-- approvals and clears them for rejections. A second trigger would duplicate
-- entitlement lifecycle logic and could cause inconsistent future behavior.

-- Allow Owner/HeadAdmin to grant the regular Admin role directly by email.
create or replace function public.grant_admin_by_email(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text;
  v_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Musisz się zalogować.';
  end if;

  select role into v_actor_role
  from public.admin_users
  where user_id = auth.uid();

  if coalesce(v_actor_role, '') not in ('owner', 'headadmin') then
    raise exception 'Tylko Owner lub HeadAdmin może nadawać rangę Admin.';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(coalesce(p_email, '')))
  limit 1;

  if v_user_id is null then
    raise exception 'Nie znaleziono konta o podanym adresie e-mail.';
  end if;

  insert into public.admin_users(user_id, role)
  values (v_user_id, 'admin')
  on conflict (user_id) do update
    set role = 'admin'
    where public.admin_users.role = 'admin';

  return true;
end;
$$;

revoke all on function public.grant_admin_by_email(text) from public;
grant execute on function public.grant_admin_by_email(text) to authenticated;
