import { supabase } from '@/integrations/supabase/client';

export async function resendConfirmation(email: string) {
  const { data, error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
  return data;
}


