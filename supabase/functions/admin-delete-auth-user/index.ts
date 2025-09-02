import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { user_id, email } = await req.json();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // prefer user_id; fallback to email lookup
    let uid = user_id as string | null;
    if (!uid && email) {
      // listUsers can be heavy; try to delete by email via admin API:
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (!error) {
        uid = data?.users?.find(u => u?.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
      }
    }

    if (uid) {
      await admin.auth.admin.deleteUser(uid).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, user_id: uid ?? null }), { headers: cors });
  } catch (e) {
    console.error('[ADMIN_DELETE_AUTH] unexpected:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors });
  }
});
