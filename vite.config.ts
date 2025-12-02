
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    base: '/ivan-ai-photo/', // GitHub Pages repository name or '/' if hosted on root domain
    define: {
      // -----------------------------------------------------------------------
      // 配置說明 / CONFIGURATION NOTE:
      // 請將下方的 "AIza..." 替換為您真實的 Google Gemini API Key。
      // 這樣您的朋友登入後就可以直接使用，無需再輸入 Key。
      // Replace the string below with your REAL Gemini API Key.
      // -----------------------------------------------------------------------
      'process.env.API_KEY': JSON.stringify("AIzaSyCeR52YbrlvyOqk8-cOyTwEVZ9TYRrbdCg") 
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});
