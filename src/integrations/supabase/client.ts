
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://dyldadfeptrokxluwnhf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bGRhZGZlcHRyb2t4bHV3bmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NzI4ODYsImV4cCI6MjA2MjI0ODg4Nn0.IygF9-eM5npIe268DspCDSOsEdjV3jBIJOULdlpluRI";

// Get the current URL for the app
const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
    detectSessionInUrl: true, 
    // Set the redirect URLs to the current domain rather than localhost
    redirectTo: `${currentUrl}/auth/callback`,
  }
});
