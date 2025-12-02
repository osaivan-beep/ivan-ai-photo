
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // FORCE INJECT the Gemini API Key.
  // Priority: 
  // 1. System Environment Variable (process.env.API_KEY) - This is what Vercel/GitHub Actions uses.
  // 2. .env file loaded by loadEnv (env.API_KEY) - This is for local development.
  const apiKey = process.env.API_KEY || env.API_KEY || "";

  return {
    plugins: [react()],
    base: './', // Changed from specific repo name to relative path for universal compatibility (Vercel & GitHub)
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});
