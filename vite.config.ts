import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  // 優先順序: GitHub Actions (process.env) > 本地 .env (env) > 空字串
  const finalApiKey = process.env.API_KEY || env.API_KEY || "";

  // 在 Build 過程中顯示是否成功抓取到 Key (這會顯示在 GitHub Actions 的 Log 中，不會洩漏 Key)
  if (finalApiKey) {
    console.log("✅ Build: API Key detected successfully.");
  } else {
    console.warn("⚠️ Build: No API Key detected! The app will not work.");
  }

  return {
    plugins: [react()],
    base: '/ivan-ai-photo/', 
    define: {
      // 直接注入 Key，不再使用範例字串
      'process.env.API_KEY': JSON.stringify(finalApiKey) 
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});
