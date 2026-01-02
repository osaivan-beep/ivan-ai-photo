
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

// 管理員名單
const ADMIN_EMAILS = ['osa.ivan@gmail.com'];

/**
 * 檢查是否為管理員
 */
function checkAdmin(auth) {
    if (!auth || !auth.token || !ADMIN_EMAILS.includes(auth.token.email)) {
        throw new HttpsError("permission-denied", "權限不足，僅限管理員操作。");
    }
}

/**
 * 預檢積分是否足夠
 */
async function preCheckCredits(uid, cost) {
    if (cost <= 0) return true;
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) throw new HttpsError("not-found", "找不到用戶帳號。");
    const currentCredits = userDoc.data().credits || 0;
    if (currentCredits < cost) {
        throw new HttpsError("failed-precondition", `點數不足 (剩餘: ${currentCredits}, 需: ${cost})。`);
    }
    return true;
}

/**
 * 嚴格扣點與日誌記錄邏輯 (僅在 AI 成功後執行)
 */
async function strictDeductCredits(uid, cost, action) {
  if (cost <= 0) return;
  const userRef = db.collection("users").doc(uid);
  const logRef = db.collection("usage_logs").doc();
  
  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new HttpsError("not-found", "找不到用戶帳號。");
      const currentCredits = userDoc.data().credits || 0;
      
      // 二次檢查防止競爭條件
      if (currentCredits < cost) {
        throw new HttpsError("failed-precondition", "扣點時發現點數不足。");
      }
      
      transaction.update(userRef, { credits: currentCredits - cost });
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
    console.error("Deduction Transaction failed:", e.message);
    throw new HttpsError("internal", "扣點程序失敗。");
  }
}

/**
 * 徹底刪除用戶 (Auth + Firestore)
 */
export const adminDeleteUser = onCall({
    region: "asia-east1",
    memory: "256MB",
}, async (request) => {
    const { data, auth } = request;
    checkAdmin(auth);

    const { targetUid } = data;
    if (!targetUid) throw new HttpsError("invalid-argument", "缺少目標 UID。");

    try {
        await admin.auth().deleteUser(targetUid);
        await db.collection("users").doc(targetUid).delete();
        return { success: true };
    } catch (error) {
        console.error("Delete User Error:", error);
        throw new HttpsError("internal", "刪除用戶失敗: " + error.message);
    }
});

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

        const { action, payload, cost = 0 } = data;
        const uid = auth.uid;

        // 1. 預檢積分
        await preCheckCredits(uid, cost);

        // 2. 載荷大小檢查
        const payloadSize = JSON.stringify(payload).length;
        if (payloadSize > 9.5 * 1024 * 1024) { 
             throw new HttpsError("invalid-argument", "圖片數據超過系統上限 (10MB)。");
        }

        // 3. 初始化 AI 並生成
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

        // 4. 只有 AI 成功後才執行扣點
        if (candidates.length > 0 || (result.text && action === 'generateText')) {
            await strictDeductCredits(uid, cost, action);
        }

        return { text: result.text ? String(result.text) : "", candidates };

    } catch (error) {
        console.error("ivanGeniusTw Fatal:", error.message);
        throw error;
    }
});
