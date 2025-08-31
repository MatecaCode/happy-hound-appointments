// Deno Edge Function - Delete Staff Auth User
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { user_id, email, staff_profile_id } = await req.json();
    console.log('🗑️ [DELETE_STAFF_USER] Request:', { user_id, email, staff_profile_id });

    if (!user_id && !email) {
      return new Response(JSON.stringify({ ok: false, error: 'user_id or email is required' }), { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find and delete the auth user
    let userIdToDelete = user_id;
    
    if (!userIdToDelete && email) {
      // Find user by email
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      if (userError) {
        console.error('❌ [DELETE_STAFF_USER] Error listing users:', userError);
        return new Response(JSON.stringify({ ok: false, error: 'Failed to find user by email' }), { status: 400, headers: corsHeaders });
      }
      
      const userToDelete = userData.users.find(u => u.email === email);
      if (userToDelete) {
        userIdToDelete = userToDelete.id;
        console.log('✅ [DELETE_STAFF_USER] Found user by email:', userIdToDelete);
      } else {
        console.log('ℹ️ [DELETE_STAFF_USER] No auth user found for email:', email);
        return new Response(JSON.stringify({ ok: true, message: 'No auth user found to delete' }), { headers: corsHeaders });
      }
    }
    
    // Delete the auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);
    
    if (error) {
      console.error('❌ [DELETE_STAFF_USER] Auth deletion error:', error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers: corsHeaders });
    }

    console.log('✅ [DELETE_STAFF_USER] Auth user deleted successfully:', userIdToDelete);
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    
  } catch (e) {
    console.error('❌ [DELETE_STAFF_USER] Unexpected error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
