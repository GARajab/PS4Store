
import { createClient } from '@supabase/supabase-js';

/**
 * PRODUCTION CONNECTIVITY FIX:
 * On Vercel, production builds often have different env var resolution than preview branches.
 * This helper ensures that if the environment variables are missing, empty, or set to "undefined",
 * we fall back to the project's master credentials immediately.
 */
const getSafeEnv = (key: string, hardcoded: string): string => {
  // @ts-ignore
  const envVal = typeof process !== 'undefined' && process.env ? process.env[key] : null;
  
  // Strict check for "empty" or "broken" environment strings
  if (!envVal || envVal === '' || envVal === 'undefined' || envVal === 'null') {
    return hardcoded;
  }
  return envVal;
};

const MASTER_URL = 'https://vzngccbrzlznlbfmdnzg.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bmdjY2Jyemx6bmxiZm1kbnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTE3MzcsImV4cCI6MjA4MzM4NzczN30.OA4RxQg6rg6P38EHJX0eqwWcpcqLTbhDUr0iKSU76Aw';

const supabaseUrl = getSafeEnv('SUPABASE_URL', MASTER_URL);
const supabaseAnonKey = getSafeEnv('SUPABASE_ANON_KEY', MASTER_KEY);

// Log connection attempt for debugging in production console
console.log(`[Supabase] Initializing connection to: ${supabaseUrl.substring(0, 15)}...`);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
