
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Fix: Property 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // FORCE INJECT the Gemini API Key.
  // Priority: 
  // 1. System Environment Variable (process.env.API_KEY) - This is what GitHub Actions uses.
  // 2. .env file loaded by loadEnv (env.API_KEY) - This is for local development with .env file.
  // 3. Hardcoded Fallback - This is the last resort (the shared key).
  const apiKey = process.env.API_KEY || env.API_KEY || "AIzaSyCeR52YbrlvyOqk8-cOyTwEVZ9TYRrbdCg";

  return {
    plugins: [react()],
    base: '/ivan-ai-photo/', // GitHub Pages repository name
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});
