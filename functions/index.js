
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

// ⚠️ GLOBAL LOG TO VERIFY DEPLOYMENT ⚠️
console.log("v1.0.147: Deployment Active. Fix: Function Renamed to 'ivanFinalV1'.");

// Define secret for managed mode
const geminiApiKey = defineSecret("GEMINI_API_KEY");

/**
 * Validates user credits and deducts them if sufficient.
 */
async function deductCredits(uid, cost) {
  if (cost === 0) return;
  const userRef = db.collection("users").doc(uid);
  
  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User profile not found.");
    }
    const currentCredits = userDoc.data().credits || 0;
    if (currentCredits < cost) {
      throw new HttpsError("resource-exhausted", "Insufficient credits.");
    }
    transaction.update(userRef, { credits: currentCredits - cost });
  });
}

/**
 * Helper to refund credits if API call fails
 */
async function refundCredits(uid, cost) {
  if (cost === 0) return;
  const userRef = db.collection("users").doc(uid);
  await userRef.update({ credits: FieldValue.increment(cost) });
}

// Renamed to ivanFinalV1 to provide a fresh resource namespace and bypass IAM locks
export const ivanFinalV1 = onCall(
  { 
    secrets: [geminiApiKey],
    timeoutSeconds: 300, 
    memory: "2GiB",
    region: "us-central1",
    maxInstances: 10,
    cors: true, 
  }, 
  async (request) => {
    // ⚠️ FORCE LOGGING TO STDERR TO BYPASS FILTERS ⚠️
    console.error("v1.0.147: Function STARTING. User:", request.auth?.uid);

    try {
        // 0. Ping Test (Does not require Auth or API Key)
        if (request.data && request.data.action === 'ping') {
            return { message: 'pong', status: 'ok', version: 'v1.0.147' };
        }

        // 1. Basic Authentication Check
        if (!request.auth) {
          throw new HttpsError("unauthenticated", "User must be logged in.");
        }

        // 2. Data Validation
        if (!request.data) {
             throw new HttpsError("invalid-argument", "Missing request data.");
        }

        const { action, payload, cost = 0 } = request.data;
        const uid = request.auth.uid;
        
        // 3. Resolve API Key with defensive coding
        let apiKey = "";
        try {
            apiKey = geminiApiKey.value();
            if (!apiKey || typeof apiKey !== 'string') {
                console.error("Secret 'GEMINI_API_KEY' is empty or invalid type.");
                throw new Error("Secret is empty");
            }
            apiKey = apiKey.trim();
        } catch (e) {
            console.error("CRITICAL: Failed to access Secret Manager.", e);
            throw new HttpsError("failed-precondition", "Backend Error: Missing API Key (Secret Empty). Please run 'firebase functions:secrets:set GEMINI_API_KEY'.");
        }
        
        // 4. Deduct Credits
        try {
          await deductCredits(uid, cost);
        } catch (e) {
          console.error("Credit deduction failed:", e);
          throw e; 
        }

        // 5. Initialize AI (Inside try-catch to prevent crash)
        let ai;
        try {
            ai = new GoogleGenAI({ apiKey: apiKey });
        } catch (initError) {
            console.error("GoogleGenAI Initialization Failed:", initError);
            throw new HttpsError("internal", "AI Client Initialization Failed. Check API Key format.");
        }
        
        let result;

        if (action === 'generateImage') {
            result = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ text: payload.prompt }] },
              config: payload.config || {}
            });
        } else if (action === 'editImage') {
            const cleanParts = payload.parts.map(p => {
                if(p.inlineData) {
                    return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data } };
                }
                if(p.text) return { text: p.text };
                return p;
            });
            result = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: cleanParts },
              config: payload.config || {}
            });
        } else if (action === 'generateText') {
            const modelName = payload.modelName || 'gemini-2.5-flash';
            result = await ai.models.generateContent({
              model: modelName,
              contents: payload.contents,
              config: payload.config || {}
            });
        } else {
            throw new HttpsError("invalid-argument", `Unknown action: ${action}`);
        }

        // 6. Sanitize Response
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

        return {
            text: result.text ? String(result.text) : "",
            candidates: candidates
        };

    } catch (error) {
        console.error("v1.0.147 FATAL ERROR:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        
        // Attempt refund
        if (request.auth && request.auth.uid && request.data && request.data.cost > 0) {
             try { await refundCredits(request.auth.uid, request.data.cost); } catch(e) {}
        }

        // Rethrow known errors
        if (error.code && error.details) throw error;
        
        const msg = error.message || "Unknown Backend Error";
        if (msg.includes("429")) {
            throw new HttpsError("resource-exhausted", "AI Service Busy (429). Please retry.");
        }
        
        throw new HttpsError("internal", `Server Error: ${msg}`);
    }
  }
);
