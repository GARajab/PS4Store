
import { createClient } from '@supabase/supabase-js';

// Master fallback credentials
const MASTER_URL = 'https://vzngccbrzlznlbfmdnzg.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bmdjY2Jyemx6bmxiZm1kbnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTE3MzcsImV4cCI6MjA4MzM4NzczN30.OA4RxQg6rg6P38EHJX0eqwWcpcqLTbhDUr0iKSU76Aw';

/**
 * Robust environment variable retriever
 * Works across Vite dev, Vite build, and various deployment environments (Vercel/Netlify)
 */
const getEnv = (key: string, defaultValue: string): string => {
  // 1. Try Vite's import.meta.env first (Standard for Vite apps)
  try {
    // @ts-ignore
    const metaEnv = typeof import.meta !== 'undefined' ? import.meta.env : null;
    if (metaEnv) {
      const val = metaEnv[key] || metaEnv[`VITE_${key}`];
      if (val && val !== 'undefined' && val !== 'null') return val;
    }
  } catch (e) {}

  // 2. Try global process.env (Vercel/Node environment fallback)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      const val = process.env[key] || process.env[`VITE_${key}`];
      if (val && val !== 'undefined' && val !== 'null') return val;
    }
  } catch (e) {}

  // 3. Last resort: Return provided default
  return defaultValue;
};

const supabaseUrl = getEnv('SUPABASE_URL', MASTER_URL);
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', MASTER_KEY);

console.debug(`[Supabase] Initializing with Endpoint: ${supabaseUrl.substring(0, 15)}...`);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'playfree-vault-auth-v3',
    flowType: 'pkce'
  },
  global: {
    headers: { 'x-application-name': 'playfree-v2' }
  }
});
