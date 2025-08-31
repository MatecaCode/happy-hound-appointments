// Deno Edge Function
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// CORS: allow supabase-js preflight headers (x-client-info, authorization, apikey)
const corsHeaders: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, staff_profile_id, name } = await req.json();

    if (!email || !staff_profile_id) {
      return new Response(JSON.stringify({ ok: false, error: 'email and staff_profile_id are required' }), { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // server-side only
    );

    // Send invite (uses project email template + redirect)
    const redirectTo =
      Deno.env.get('STAFF_CLAIM_REDIRECT') // e.g. https://vettale.shop/staff/claim
      ?? Deno.env.get('CLAIM_REDIRECT')    // fallback if shared
      ?? undefined;

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers: corsHeaders });
    }

    // Stamp invite time on the staff profile (idempotent)
    await supabaseAdmin
      .from('staff_profiles')
      .update({ claim_invited_at: new Date().toISOString(), email })
      .eq('id', staff_profile_id);

    return new Response(JSON.stringify({ ok: true, user: data.user?.id ?? null }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: corsHeaders });
  }
});