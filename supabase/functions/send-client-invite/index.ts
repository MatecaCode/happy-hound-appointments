// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLAIM_REDIRECT = Deno.env.get("CLAIM_REDIRECT") ?? "https://vettale.shop/claim";

const admin = createClient(url, serviceKey, { auth: { persistSession: false }});

serve(async (req) => {
  try {
    const { email, client_id } = await req.json();
    if (!email || !client_id) return new Response("email and client_id required", { status: 400 });

    // ensure eligible (admin_created & unclaimed)
    const { data: rows, error: selErr } = await admin
      .from("clients")
      .select("id, email, admin_created, user_id, claim_invited_at")
      .eq("id", client_id).eq("email", email).limit(1);
    if (selErr) throw selErr;
    const c = rows?.[0];
    if (!c) return new Response("client not found or email mismatch", { status: 404 });
    if (!c.admin_created || c.user_id) return new Response("client not eligible for invite", { status: 409 });

    // send invite using Supabase Auth (uses your Invite template)
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: CLAIM_REDIRECT,
      data: { preclient_id: client_id }
    });
    if (inviteErr) throw inviteErr;

    // stamp invited time (optional column; safe if it exists)
    await admin.from("clients").update({ claim_invited_at: new Date().toISOString() }).eq("id", client_id);

    return new Response(JSON.stringify({ status: "invited" }), { headers: { "content-type": "application/json" }});
  } catch (e) {
    return new Response(String(e?.message ?? e), { status: 500 });
  }
});
