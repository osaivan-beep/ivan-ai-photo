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
      // 1. process.env.API_KEY: 這是 GitHub Actions (CI/CD) 注入 Secret 的位置。
      // 2. env.API_KEY: 這是本地 .env 檔案的位置。
      // 3. 最後的字串是防呆用的範例 Key (實際上不會運作，因為它已被限制)。
      //
      // 這樣修改後，GitHub 打包時就會抓到您設定好的 Secret 了。
      // -----------------------------------------------------------------------
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || "AIzaSyCeR52YbrlvyOqk8-cOyTwEVZ9TYRrbdCg") 
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});
