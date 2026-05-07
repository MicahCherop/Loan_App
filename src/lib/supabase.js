import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL. Add it to .env and restart the Vite dev server.');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY. Add your Supabase anon public key to .env and restart the Vite dev server.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
