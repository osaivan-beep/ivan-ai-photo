
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    base: '/', 
    define: {
      'process.env.API_KEY': JSON.stringify("") 
    },
    optimizeDeps: {
      // Critical: Exclude @google/genai from dependency pre-bundling
      // because it is loaded via importmap (CDN) and not in node_modules.
      exclude: ['@google/genai']
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        // Externalize @google/genai so Rollup doesn't try to resolve it from node_modules
        external: ['@google/genai']
      }
    }
  };
});
