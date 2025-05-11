
import { createClient } from '@supabase/supabase-js';

// Use the actual Supabase URL and anon key from the integrations file
const supabaseUrl = "https://dyldadfeptrokxluwnhf.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bGRhZGZlcHRyb2t4bHV3bmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NzI4ODYsImV4cCI6MjA2MjI0ODg4Nn0.IygF9-eM5npIe268DspCDSOsEdjV3jBIJOULdlpluRI";

// Initialize Supabase client
let supabaseClient;

try {
  // Create Supabase client with configured values
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase conectado com sucesso!');
} catch (error) {
  console.error('❌ Erro ao conectar com Supabase:', error);
  
  // Fallback to placeholder client to prevent app crashes
  supabaseClient = createClient(
    'https://placeholder-url.supabase.co',
    'placeholder-key'
  );
}

export const supabase = supabaseClient;
