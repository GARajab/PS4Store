
import { createClient } from '@supabase/supabase-js';

// Hardcoded fallback credentials for the Master Archive
const MASTER_URL = 'https://vzngccbrzlznlbfmdnzg.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bmdjY2Jyemx6bmxiZm1kbnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTE3MzcsImV4cCI6MjA4MzM4NzczN30.OA4RxQg6rg6P38EHJX0eqwWcpcqLTbhDUr0iKSU76Aw';

/**
 * Safe environment variable retrieval.
 * Prioritizes Vite's injection, then fallbacks to process.env, then the Master Archive.
 */
const getSafeEnv = (key: string, fallback: string): string => {
  // 1. Check Vite's import.meta.env
  try {
    // @ts-ignore
    const val = import.meta.env?.[key] || import.meta.env?.[`VITE_${key}`];
    if (val && val !== 'undefined') return val;
  } catch (e) {}

  // 2. Check global process.env (Vercel/Node fallback)
  try {
    // @ts-ignore
    const val = typeof process !== 'undefined' && process.env ? (process.env[key] || process.env[`VITE_${key}`]) : null;
    if (val && val !== 'undefined') return val;
  } catch (e) {}

  // 3. Check global window.process (defined in index.html)
  try {
    // @ts-ignore
    const val = window.process?.env?.[key] || window.process?.env?.[`VITE_${key}`];
    if (val && val !== 'undefined') return val;
  } catch (e) {}

  return fallback;
};

const supabaseUrl = getSafeEnv('SUPABASE_URL', MASTER_URL);
const supabaseAnonKey = getSafeEnv('SUPABASE_ANON_KEY', MASTER_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'playfree-vault-auth-v4', // Incremented version to clear any corrupt local storage
    flowType: 'pkce'
  }
});
