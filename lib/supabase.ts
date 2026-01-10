
import { createClient } from '@supabase/supabase-js';

const MASTER_URL = 'https://vzngccbrzlznlbfmdnzg.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bmdjY2Jyemx6bmxiZm1kbnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTE3MzcsImV4cCI6MjA4MzM4NzczN30.OA4RxQg6rg6P38EHJX0eqwWcpcqLTbhDUr0iKSU76Aw';

const getEnv = (key: string, fallback: string): string => {
  const meta = (import.meta as any);
  if (meta?.env) {
    const val = meta.env[key] || meta.env[`VITE_${key}`];
    if (val && val !== 'undefined') return val;
  }
  const proc = (typeof process !== 'undefined' ? process : {}) as any;
  if (proc.env) {
    const val = proc.env[key] || proc.env[`VITE_${key}`];
    if (val && val !== 'undefined') return val;
  }
  return fallback;
};

const supabaseUrl = getEnv('SUPABASE_URL', MASTER_URL);
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', MASTER_KEY);

/**
 * Enterprise-Grade Supabase Configuration
 * Uses versioned storage key to prevent stale session conflicts.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'playfree-v11-auth-stable', 
    flowType: 'pkce',
    storage: window.localStorage // Explicitly use browser storage
  },
  global: {
    headers: { 'x-application-name': 'playfree-pro-archivist' }
  }
});
