import type { SupabaseClient } from '@supabase/supabase-js';

export type StaffLite = { id: string; email: string; name?: string };

export async function sendStaffSetupEmail(
  supabase: SupabaseClient,
  staff: StaffLite,
  opts?: { timeoutMs?: number }
) {
  const timeoutMs = opts?.timeoutMs ?? 15000;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log('[STAFF_SETUP] invoking send-staff-setup with', staff);
    const { data, error } = await supabase.functions.invoke('send-staff-setup', {
      signal: controller.signal,
      body: { email: staff.email, staff_profile_id: staff.id, name: staff.name },
    });

    if (error) throw error;
    console.log('[STAFF_SETUP] ok:', data);
    return { ok: true as const, data };
  } catch (e) {
    console.error('[STAFF_SETUP] error:', e);
    return { ok: false as const, error: (e as any)?.message || String(e) };
  } finally {
    clearTimeout(id);
  }
}

export async function adminDeleteAuthUser(
  supabase: SupabaseClient,
  payload: { user_id?: string | null; email?: string | null },
  timeoutMs = 12000
) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // @ts-ignore
    const { data, error } = await supabase.functions.invoke('delete-staff-user', {
      body: payload,
      fetch: (url: string, init: any) => fetch(url, { ...init, signal: controller.signal }),
    });
    if (error) throw error;
    return data;
  } finally {
    clearTimeout(t);
  }
}
