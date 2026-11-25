-- Restrict public execution of SECURITY DEFINER functions in the beta project.
-- Authenticated access remains available for application RPCs that enforce authorization internally.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.signature);
  END LOOP;
END $$;

-- Trigger-only and worker-only functions must not be callable through the client Data API.
REVOKE EXECUTE ON FUNCTION public.create_profile_for_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_claim_discord_outbox(integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_award_achievements(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_prevent_self_order_review() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_after_admin_reply() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_after_bug_report() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_after_chat_message() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_after_collaboration_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_after_download_achievement() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_after_event_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_after_first_trap_view() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_after_order_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_after_order_update() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_after_review_achievement() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_after_site_proposal() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_after_transfer_achievement() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_after_trap_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tm_after_trap_proposal() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.tm_claim_discord_outbox(integer) TO service_role;
