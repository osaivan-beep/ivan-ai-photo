
import type { FirebaseConfig } from '../types';

/**
 * 公開的 Firebase 連線設定 (Public Firebase Configuration)
 * 這些 ID 是公開資訊，用於讓瀏覽器找到您的專案。
 * 安全性說明：API Key 限制在特定網域 (Referer) 使用，且僅能呼叫 Firebase Auth/Storage，無法呼叫 Gemini。
 */
export const embeddedConfig: FirebaseConfig = {
  apiKey: "AIzaSyC0JNw9WC_ZttdDzVnUUW2i_04kvUowQDg", // Updated to the correct Browser Key
  authDomain: "ivan-ai-photo-web.firebaseapp.com",
  projectId: "ivan-ai-photo-web",
  storageBucket: "ivan-ai-photo-web.firebasestorage.app",
  messagingSenderId: "145260344607",
  appId: "1:145260344607:web:2c7700206263595679956d",
  adminEmail: "osa.ivan@gmail.com"
};
