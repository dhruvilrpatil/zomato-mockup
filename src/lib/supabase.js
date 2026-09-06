import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://axdopaswdikbeusvfjrk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_bae6jMXSlk3UCy65eQ5QBQ_rZ2rpBx2';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
