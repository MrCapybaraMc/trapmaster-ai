begin;
drop policy if exists "Users manage own reviews" on public.trap_reviews;
create policy "Users manage own reviews with access" on public.trap_reviews for all to authenticated
using(user_id=auth.uid() and public.has_trapmaster_access())
with check(user_id=auth.uid() and public.has_trapmaster_access());

drop policy if exists "Users manage own favorites" on public.trap_favorites;
create policy "Users manage own favorites with access" on public.trap_favorites for all to authenticated
using(user_id=auth.uid() and public.has_trapmaster_access())
with check(user_id=auth.uid() and public.has_trapmaster_access());
commit;