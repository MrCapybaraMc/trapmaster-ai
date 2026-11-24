begin;
drop policy if exists "Recipients read their gift orders" on public.orders;
create policy "Recipients read their gift orders" on public.orders for select to authenticated
using(is_gift=true and recipient_user_id=auth.uid());
commit;