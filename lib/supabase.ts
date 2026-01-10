
import { createClient } from '@supabase/supabase-js';

// Hardcoded fallback credentials for the Master Archive
const MASTER_URL = 'https://vzngccbrzlznlbfmdnzg.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bmdjY2Jyemx6bmxiZm1kbnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTE3MzcsImV4cCI6MjA4MzM4NzczN30.OA4RxQg6rg6P38EHJX0eqwWcpcqLTbhDUr0iKSU76Aw';

/**
 * Robust environment variable retriever for Vite + Vercel
 */
const getEnv = (key: string, fallback: string): string => {
  // Fix: Cast import.meta to any to resolve "Property 'env' does not exist on type 'ImportMeta'"
  const meta = import.meta as any;
  if (typeof meta !== 'undefined' && meta.env) {
    const val = meta.env[key] || meta.env[`VITE_${key}`];
    if (val && val !== 'undefined') return val;
  }

  // Fix: Use any casting for process to safely check for env in non-Node environments
  const proc = (typeof process !== 'undefined' ? process : {}) as any;
  if (proc.env) {
    const val = proc.env[key] || proc.env[`VITE_${key}`];
    if (val && val !== 'undefined') return val;
  }

  return fallback;
};

const supabaseUrl = getEnv('SUPABASE_URL', MASTER_URL);
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', MASTER_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'playfree-auth-v5', // New key to ensure fresh storage state
    flowType: 'pkce'
  }
});
