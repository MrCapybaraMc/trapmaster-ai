import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Brakuje konfiguracji Supabase." }, 500);
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "Wymagane jest zalogowanie." }, 401);
    const publicClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: authData, error: authError } = await publicClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Sesja jest nieprawidłowa lub wygasła." }, 401);
    const adminClient = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: caller, error: roleError } = await adminClient.from("admin_users").select("role").eq("user_id", authData.user.id).maybeSingle();
    if (roleError || !caller || !["headadmin", "owner"].includes(caller.role)) return json({ error: "Usuwanie kont jest dostępne tylko dla HeadAdmina i Ownera." }, 403);
    const body = await req.json();
    if (body?.action !== "delete" || typeof body?.user_id !== "string") return json({ error: "Resetowanie haseł jest wyłączone. Dostępne jest wyłącznie usuwanie kont." }, 400);
    const targetId = body.user_id;
    if (targetId === authData.user.id) return json({ error: "Nie możesz usunąć własnego konta." }, 400);
    const { data: targetRole, error: targetRoleError } = await adminClient.from("admin_users").select("role").eq("user_id", targetId).maybeSingle();
    if (targetRoleError) return json({ error: "Nie udało się zweryfikować roli konta." }, 500);
    if (targetRole) return json({ error: "Konta administratorów, HeadAdminów i Ownera są chronione." }, 403);
    const { data: targetData, error: targetError } = await adminClient.auth.admin.getUserById(targetId);
    if (targetError || !targetData.user) return json({ error: "Nie znaleziono konta użytkownika." }, 404);
    const cleanup = [
      () => adminClient.from("order_reviews").delete().eq("reviewer_user_id", targetId),
      () => adminClient.from("gifts").delete().eq("granted_by", targetId),
      () => adminClient.from("access_revocations").delete().eq("revoked_by", targetId),
      () => adminClient.from("account_suspensions").delete().eq("suspended_by", targetId),
      () => adminClient.from("site_announcements").delete().eq("created_by", targetId),
      () => adminClient.from("discount_codes").update({ created_by: authData.user.id }).eq("created_by", targetId),
    ];
    for (const step of cleanup) {
      const { error } = await step();
      if (error) return json({ error: "Nie udało się przygotować usunięcia konta: " + error.message }, 500);
    }
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetId);
    if (deleteError) return json({ error: deleteError.message }, 400);
    return json({ message: "Konto użytkownika zostało trwale usunięte." });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Nieoczekiwany błąd serwera." }, 500);
  }
});
