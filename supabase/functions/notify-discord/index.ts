import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const workerSecret = Deno.env.get("TM_DISCORD_WORKER_SECRET");
  if (!workerSecret || request.headers.get("x-worker-secret") !== workerSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookUrl = Deno.env.get("DISCORD_ADMIN_WEBHOOK_URL");
  if (!supabaseUrl || !serviceRoleKey || !webhookUrl) {
    return Response.json({ error: "Missing server environment configuration." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: events, error } = await supabase.rpc("tm_claim_discord_outbox", { p_limit: 20 });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  let delivered = 0;
  for (const event of events ?? []) {
    const content = "**TrapMasters / " + event.event_type + "**\n" +
      JSON.stringify(event.payload).slice(0, 1500);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (response.ok) {
      await supabase.from("tm_discord_outbox").update({
        delivered_at: new Date().toISOString(),
        attempts: event.attempts + 1,
        last_error: null,
        locked_at: null,
      }).eq("id", event.id);
      delivered += 1;
    } else {
      await supabase.from("tm_discord_outbox").update({
        attempts: event.attempts + 1,
        last_error: "Discord webhook returned " + response.status,
        locked_at: null,
      }).eq("id", event.id);
    }
  }

  return Response.json({ delivered, checked: events?.length ?? 0 });
});
