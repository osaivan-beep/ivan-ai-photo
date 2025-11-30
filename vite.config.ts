
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    base: '/ivan-ai-photo/', // GitHub Pages repository name
    define: {
      // FORCE INJECT the Gemini API Key.
      'process.env.API_KEY': JSON.stringify("AIzaSyCeR52YbrlvyOqk8-cOyTwEVZ9TYRrbdCg")
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});
