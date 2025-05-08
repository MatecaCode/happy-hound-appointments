
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Inicializa a variável do cliente Supabase
let supabaseClient;

// Verifica se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: As variáveis de ambiente do Supabase não estão configuradas.');
  console.log('Para conectar ao Supabase, adicione as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas configurações do projeto.');
  
  // Usa valores vazios temporários para permitir que a aplicação compile
  supabaseClient = createClient(
    'https://placeholder-url.supabase.co',
    'placeholder-key'
  );
} else {
  // Cria o cliente Supabase com as variáveis de ambiente configuradas
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  console.log('Supabase conectado com sucesso!');
}

export const supabase = supabaseClient;
