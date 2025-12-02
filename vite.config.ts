
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: '/ivan-ai-photo/', // GitHub Pages repository name
    define: {
      // -----------------------------------------------------------------------
      // 修正重點 / FIX:
      // 優先讀取 `env.API_KEY` (來自 GitHub Secrets)。
      // 如果本地開發沒有設定環境變數，才會使用後面的字串。
      // -----------------------------------------------------------------------
      'process.env.API_KEY': JSON.stringify(env.API_KEY || "AIzaSyCeR52YbrlvyOqk8-cOyTwEVZ9TYRrbdCg") 
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});
