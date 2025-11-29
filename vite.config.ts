import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    base: './', // 設定為相對路徑，確保在 GitHub Pages 上能正確讀取資源
    define: {
      // 將 GitHub Secrets 中的 API_KEY 注入到程式碼中
      // 優先讀取系統環境變數 (GitHub Actions), 其次讀取 .env 檔案
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || '')
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});