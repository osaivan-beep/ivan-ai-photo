import type { FirebaseConfig } from '../types';

/**
 * ============================================================================
 * 【給管理員的說明 / INSTRUCTIONS FOR ADMIN】
 * 
 * 這是您已經填寫好的 Firebase 設定。
 * 當您上傳到 GitHub 後，使用者打開網頁會直接讀取這裡的設定，並顯示登入畫面。
 * 
 * This is your hardcoded Firebase configuration.
 * Users will load this config immediately upon visiting the deployed site.
 * ============================================================================
 */

export const embeddedConfig: FirebaseConfig | null = {
  // Firebase Browser Key (用於登入與資料庫 / For Auth & Firestore)
  // 這必須是 Google Cloud Console 顯示的那組 Browser key
  apiKey: "AIzaSyC0JNw9WC_ZttdDzVnUUW2i_04kvUowQDg", 
  authDomain: "ivan-ai-photo-web.firebaseapp.com",
  projectId: "ivan-ai-photo-web",
  storageBucket: "ivan-ai-photo-web.firebasestorage.app",
  messagingSenderId: "922917490246",
  appId: "1:922917490246:web:047ddc074f3a0d636c4447",
  measurementId: "G-EX29ZPS2ET",
  adminEmail: "osa.ivan@gmail.com"
};