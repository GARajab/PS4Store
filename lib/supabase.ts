
import { createClient } from '@supabase/supabase-js';

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

/**
 * PRODUCTION RESILIENCE:
 * We use a custom fetch handler to intercept and swallow 'AbortError' 
 * which often triggers "signal is aborted without reason" on production Vercel builds.
 */
const customFetch = async (url: string, options: any) => {
  try {
    return await fetch(url, options);
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      console.warn('[Supabase] Suppressed AbortError during fetch');
      // Return a dummy response that won't crash the internal client
      return new Response(JSON.stringify({ error: 'aborted' }), { status: 499 });
    }
    throw err;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'playfree-auth-token-v1'
  },
  global: {
    fetch: customFetch,
    headers: { 'x-application-name': 'playfree-ps-store' }
  }
});
