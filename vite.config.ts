
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Property 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    base: '/ivan-ai-photo/', // GitHub Pages repository name
    define: {
      // FORCE INJECT the Gemini API Key.
      // Priority: 1. Environment Variable (GitHub Secrets) 2. Hardcoded Fallback
      'process.env.API_KEY': JSON.stringify(env.API_KEY || "AIzaSyCeR52YbrlvyOqk8-cOyTwEVZ9TYRrbdCg")
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});
