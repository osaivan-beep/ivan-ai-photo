import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    base: '/ivan-ai-photo/', // GitHub Pages repository name
    define: {
      // Inject API KEY
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || '')
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});