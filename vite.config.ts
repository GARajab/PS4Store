
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Ensure standard process.env structure exists for libraries that expect it
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    // Inject specific keys for the getEnv helper
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || ''),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || ''),
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});
