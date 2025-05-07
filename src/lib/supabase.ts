
import { createClient } from '@supabase/supabase-js';

// Como você já tem o Supabase configurado, o URL e a chave serão obtidos do ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
