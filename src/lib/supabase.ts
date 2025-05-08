
import { createClient } from '@supabase/supabase-js';

// Get environment variables for Supabase connection
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize Supabase client variable
let supabaseClient;

// Check if environment variables are properly configured
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Erro: As variáveis de ambiente do Supabase não estão configuradas.');
  console.log('📌 Como configurar:');
  console.log('1. Acesse o dashboard do seu projeto no Supabase');
  console.log('2. Vá em Settings > API');
  console.log('3. Copie o "Project URL" e a "anon public" key');
  console.log('4. No Lovable, vá em Project > Settings > Environment Variables');
  console.log('5. Adicione as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY com os valores copiados');
  
  // Use placeholder values to allow the app to compile without errors
  supabaseClient = createClient(
    'https://placeholder-url.supabase.co',
    'placeholder-key'
  );
} else {
  try {
    // Create Supabase client with configured environment variables
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
}

export const supabase = supabaseClient;
