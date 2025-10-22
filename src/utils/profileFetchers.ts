import type { PostgrestError } from '@supabase/supabase-js';

function isNoRowsError(error: PostgrestError | null | undefined) {
  return !!error && (error as any).code === 'PGRST116';
}

export async function fetchStaffProfileId(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && !isNoRowsError(error)) throw error;
  return data?.id ?? null;
}

export async function fetchClientByUserId(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && !isNoRowsError(error)) throw error;
  return data ?? null;
}


