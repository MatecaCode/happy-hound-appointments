// Deno Edge Function - Staff Account Setup (Password Reset Approach)
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
    const { email, staff_profile_id, name } = await req.json();
    console.log('🔐 [STAFF_SETUP] Request:', { email, staff_profile_id, name });

    if (!email || !staff_profile_id) {
      return new Response(JSON.stringify({ ok: false, error: 'email and staff_profile_id are required' }), { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const redirectTo = 'https://vettale.vercel.app/staff/claim';
    console.log('🔗 [STAFF_SETUP] Using redirectTo:', redirectTo);

    // Step 1: Create auth user (if doesn't exist) or get existing
    let userId;
    
    // Check if user already exists
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    if (userError) {
      return new Response(JSON.stringify({ ok: false, error: 'Failed to check existing users' }), { status: 400, headers: corsHeaders });
    }
    
    const existingUser = userData.users.find(u => u.email === email);
    if (existingUser) {
      userId = existingUser.id;
      console.log('✅ [STAFF_SETUP] Found existing user:', userId);
    } else {
      // Create new user without sending invite
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true, // Auto-confirm email
        user_metadata: { type: 'staff', staff_profile_id: staff_profile_id }
      });
      
      if (createError) {
        console.error('❌ [STAFF_SETUP] User creation error:', createError);
        return new Response(JSON.stringify({ ok: false, error: createError.message }), { status: 400, headers: corsHeaders });
      }
      
      userId = createData.user?.id;
      console.log('✅ [STAFF_SETUP] User created:', userId);
    }

    // Step 2: Send password reset link (this uses the password reset template)
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: { redirectTo: redirectTo }
    });
    
    if (resetError) {
      console.error('❌ [STAFF_SETUP] Password reset error:', resetError);
      return new Response(JSON.stringify({ ok: false, error: resetError.message }), { status: 400, headers: corsHeaders });
    }

    console.log('✅ [STAFF_SETUP] Password reset link generated');

    // Step 3: Stamp invite time on staff profile
    const { error: updateError } = await supabaseAdmin
      .from('staff_profiles')
      .update({ 
        claim_invited_at: new Date().toISOString(), 
        email: email,
        user_id: userId 
      })
      .eq('id', staff_profile_id);

    if (updateError) {
      console.error('❌ [STAFF_SETUP] Staff profile update error:', updateError);
    } else {
      console.log('✅ [STAFF_SETUP] Staff profile updated');
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      user_id: userId,
      reset_link: resetData.properties?.action_link,
      message: 'User created and password reset link sent'
    }), { headers: corsHeaders });
    
  } catch (e) {
    console.error('❌ [STAFF_SETUP] Unexpected error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: corsHeaders });
  }
});