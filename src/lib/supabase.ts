
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verifica se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: As variáveis de ambiente do Supabase não estão configuradas.');
  // Usa valores padrão temporários para evitar erros de inicialização
  // Isso permitirá que a aplicação carregue, mas as funcionalidades do Supabase não funcionarão
  export const supabase = createClient(
    'https://placeholder-url.supabase.co',
    'placeholder-key'
  );
} else {
  // Cria o cliente Supabase com as variáveis de ambiente corretas
  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
}
