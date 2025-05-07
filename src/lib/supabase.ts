
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient;

// Verifica se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: As variáveis de ambiente do Supabase não estão configuradas.');
  // Usa valores padrão temporários para evitar erros de inicialização
  // Isso permitirá que a aplicação carregue, mas as funcionalidades do Supabase não funcionarão
  supabaseClient = createClient(
    'https://placeholder-url.supabase.co',
    'placeholder-key'
  );
} else {
  // Cria o cliente Supabase com as variáveis de ambiente corretas
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseClient;
