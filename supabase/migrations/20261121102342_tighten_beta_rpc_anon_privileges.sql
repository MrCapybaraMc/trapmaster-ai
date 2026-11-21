-- Restrict privileged and authenticated-only Beta RPCs from anonymous callers.
revoke all on function public.get_discount_code_discount(text, text) from public, anon;
revoke all on function public.review_admin_application(uuid, text) from public, anon;
revoke all on function public.set_staff_role(uuid, text) from public, anon;
revoke all on function public.grant_admin_by_email(text) from public, anon;
grant execute on function public.get_discount_code_discount(text, text) to authenticated;
grant execute on function public.review_admin_application(uuid, text) to authenticated;
grant execute on function public.set_staff_role(uuid, text) to authenticated;
grant execute on function public.grant_admin_by_email(text) to authenticated;
