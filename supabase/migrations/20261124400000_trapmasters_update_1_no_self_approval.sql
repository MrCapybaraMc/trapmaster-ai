create or replace function public.tm_prevent_self_order_review()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if old.status='pending' and new.status in ('approved','rejected')
   and old.user_id=auth.uid()
   and public.tm_has_role(array['admin','headadmin','owner']) then
  raise exception 'Nie możesz zaakceptować ani odrzucić własnego zamówienia.';
 end if;
 return new;
end;
$$;
drop trigger if exists tm_prevent_self_order_review on public.orders;
create trigger tm_prevent_self_order_review before update of status on public.orders
for each row execute function public.tm_prevent_self_order_review();