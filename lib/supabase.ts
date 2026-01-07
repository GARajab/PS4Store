
import { createClient } from '@supabase/supabase-js';

// These should be set in your environment variables.
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. App may not function correctly.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
