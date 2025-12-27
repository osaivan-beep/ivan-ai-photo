
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

/**
 * 嚴格扣點與日誌記錄邏輯
 */
async function strictDeductCredits(uid, cost, action) {
  if (cost <= 0) return;
  const userRef = db.collection("users").doc(uid);
  const logRef = db.collection("usage_logs").doc();
  
  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "找不到用戶帳號。");
      }
      const currentCredits = userDoc.data().credits || 0;
      if (currentCredits < cost) {
        throw new HttpsError("failed-precondition", `點數不足 (剩餘: ${currentCredits}, 需: ${cost})。`);
      }
      
      // 更新用戶點數
      transaction.update(userRef, { credits: currentCredits - cost });
      
      // 寫入日誌 (用於後台統計)
      transaction.set(logRef, {
        uid,
        email: userDoc.data().email || 'unknown',
        cost,
        action,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    console.error("Transaction failed:", e.message);
    throw new HttpsError("internal", "資料庫通訊失敗，扣點未成功。");
  }
}

export const ivanGeniusTw = onCall({
    region: "asia-east1",
    timeoutSeconds: 300, 
    memory: "1GB",
    cors: true, 
    maxInstances: 10,
  }, async (request) => {
    const { data, auth } = request;

    try {
        if (!auth) throw new HttpsError("unauthenticated", "請先登入。");
        if (!data) throw new HttpsError("invalid-argument", "無效的請求。");

        /* GUIDELINE: API Key MUST be obtained exclusively from process.env.API_KEY. User key passing is removed. */
        const { action, payload, cost = 0 } = data;
        const uid = auth.uid;

        // 1. 載荷安全性檢查
        const payloadSize = JSON.stringify(payload).length;
        if (payloadSize > 9.5 * 1024 * 1024) { 
             throw new HttpsError("invalid-argument", "圖片數據超過系統上限 (10MB)。");
        }

        // 2. 扣點並記錄日誌 (Assume system key via process.env.API_KEY)
        await strictDeductCredits(uid, cost, action);

        // 3. 初始化 AI using pre-configured process.env.API_KEY
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let result;
        const selectedModel = payload.modelName || 'gemini-2.5-flash-image';

        if (action === 'generateImage') {
            result = await ai.models.generateContent({
              model: selectedModel,
              contents: { parts: [{ text: payload.prompt }] },
              config: payload.config || {}
            });
        } else if (action === 'editImage') {
            result = await ai.models.generateContent({
              model: selectedModel,
              contents: { parts: payload.parts },
              config: payload.config || {}
            });
        } else if (action === 'generateText') {
            /* GUIDELINE: Basic text tasks should use gemini-3-flash-preview. */
            result = await ai.models.generateContent({
              model: payload.modelName || 'gemini-3-flash-preview',
              contents: payload.contents,
              config: payload.config || {}
            });
        }

        const candidates = (result.candidates || []).map(c => {
            if (!c?.content?.parts) return null;
            return {
                content: {
                    parts: c.content.parts.map(p => {
                        const safePart = {};
                        if (p.text) safePart.text = String(p.text);
                        if (p.inlineData) {
                            safePart.inlineData = {
                                mimeType: String(p.inlineData.mimeType),
                                data: String(p.inlineData.data)
                            };
                        }
                        return safePart;
                    })
                }
            };
        }).filter(Boolean);

        /* GUIDELINE: Direct access to result.text is the correct way to extract generated content. */
        return { text: result.text ? String(result.text) : "", candidates };

    } catch (error) {
        console.error("ivanGeniusTw Fatal:", error.message);
        throw error;
    }
});
