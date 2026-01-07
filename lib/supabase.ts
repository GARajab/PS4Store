
import { createClient } from '@supabase/supabase-js';

/**
 * PASTE YOUR SUPABASE CREDENTIALS HERE
 * You can find these in your Supabase Dashboard under:
 * Project Settings > API
 */
const supabaseUrl = process.env.SUPABASE_URL || 'https://vzngccbrzlznlbfmdnzg.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bmdjY2Jyemx6bmxiZm1kbnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTE3MzcsImV4cCI6MjA4MzM4NzczN30.OA4RxQg6rg6P38EHJX0eqwWcpcqLTbhDUr0iKSU76Aw';

if (
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl === 'YOUR_SUPABASE_PROJECT_URL_HERE' || 
  supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE'
) {
  console.error("Supabase credentials missing! Please update lib/supabase.ts with your project URL and Anon Key.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
