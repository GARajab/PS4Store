
import { createClient } from '@supabase/supabase-js';

/**
 * PRODUCTION CONNECTIVITY FIX:
 * On Vercel, production builds can have inconsistent env var resolution.
 * This script ensures the master credentials are used as the primary source of truth
 * for the production custom domain.
 */
const MASTER_URL = 'https://vzngccbrzlznlbfmdnzg.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bmdjY2Jyemx6bmxiZm1kbnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTE3MzcsImV4cCI6MjA4MzM4NzczN30.OA4RxQg6rg6P38EHJX0eqwWcpcqLTbhDUr0iKSU76Aw';

const getFinalEnv = (key: string, hardcoded: string): string => {
  try {
    // @ts-ignore
    const val = typeof process !== 'undefined' && process.env ? process.env[key] : null;
    if (val && val !== 'undefined' && val !== 'null' && val !== '') return val;
  } catch (e) {}
  return hardcoded;
};

const supabaseUrl = getFinalEnv('SUPABASE_URL', MASTER_URL);
const supabaseAnonKey = getFinalEnv('SUPABASE_ANON_KEY', MASTER_KEY);

console.log(`[Supabase] Cluster: ${supabaseUrl.substring(0, 20)}...`);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: { 'x-application-name': 'playfree-ps-store-prod' }
  }
});
