// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLAIM_REDIRECT = Deno.env.get("CLAIM_REDIRECT") ?? "https://vettale.shop/claim";

const admin = createClient(url, serviceKey, { auth: { persistSession: false }});

// CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // Allow all origins for now, can be restricted later
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const { email, client_id, checkOnly } = body;
    
    if (!email) {
      return new Response("email required", { 
        status: 400, 
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    // Email availability check mode
    if (checkOnly) {
      // Check if email exists in Auth
      try {
        const { data: authUser, error: authError } = await admin.auth.admin.getUserByEmail(email);
        if (authUser?.user) {
          return new Response(JSON.stringify({ 
            available: false, 
            reason: "already_registered" 
          }), { 
            status: 409,
            headers: { ...corsHeaders, "content-type": "application/json" }
          });
        }
      } catch (authError) {
        // getUserByEmail throws if user not found, which is what we want
        console.log('Email not found in auth (expected for availability check)');
      }

      // Check if email exists in clients table (case-insensitive)
      const { data: existingClients, error: clientCheckError } = await admin
        .from("clients")
        .select("id, email")
        .ilike("email", email)
        .limit(1);
      
      if (clientCheckError) {
        console.error('Error checking existing clients:', clientCheckError);
        return new Response(JSON.stringify({ 
          available: false, 
          reason: "check_error" 
        }), { 
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }

      if (existingClients && existingClients.length > 0) {
        return new Response(JSON.stringify({ 
          available: false, 
          reason: "already_registered" 
        }), { 
          status: 409,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ available: true }), { 
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    // Normal invite mode - requires client_id
    if (!client_id) {
      return new Response("client_id required for invite", { 
        status: 400, 
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    // Check if email already exists in Auth before proceeding
    try {
      const { data: authUser, error: authError } = await admin.auth.admin.getUserByEmail(email);
      if (authUser?.user) {
        return new Response(JSON.stringify({ 
          available: false, 
          reason: "already_registered" 
        }), { 
          status: 409,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }
    } catch (authError) {
      // getUserByEmail throws if user not found, which is expected
      console.log('Email not found in auth, proceeding with invite');
    }

    // ensure eligible (admin_created & unclaimed)
    const { data: rows, error: selErr } = await admin
      .from("clients")
      .select("id, email, admin_created, user_id, claim_invited_at")
      .eq("id", client_id).eq("email", email).limit(1);
    if (selErr) throw selErr;
    const c = rows?.[0];
    if (!c) return new Response("client not found or email mismatch", { 
      status: 404, 
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
    if (!c.admin_created || c.user_id) return new Response("client not eligible for invite", { 
      status: 409, 
      headers: { ...corsHeaders, "content-type": "application/json" }
    });

    // send invite using Supabase Auth (uses your Invite template)
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: CLAIM_REDIRECT,
      data: { preclient_id: client_id }
    });
    if (inviteErr) throw inviteErr;

    // stamp invited time (optional column; safe if it exists)
    await admin.from("clients").update({ claim_invited_at: new Date().toISOString() }).eq("id", client_id);

    return new Response(JSON.stringify({ status: "invited" }), { 
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  } catch (e) {
    return new Response(String(e?.message ?? e), { 
      status: 500, 
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  }
});
