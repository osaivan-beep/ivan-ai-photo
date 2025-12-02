
import { GoogleGenAI, Modality, type GenerateContentResponse } from '@google/genai';
import type { GeminiImagePart, ImageResolution } from '../types';

// Check if a system-level key exists (from build env)
export const hasSystemKey = (): boolean => {
    return !!process.env.API_KEY && process.env.API_KEY.length > 10;
};

// Dynamic retrieval function
const getActiveKey = (): string => {
    try {
        const custom = localStorage.getItem('custom_gemini_api_key');
        if (custom && custom.trim().length > 10) {
            return custom.trim();
        }
    } catch (e) {
        console.warn("Failed to access localStorage", e);
    }
    // Return the injected key from build process (GitHub Secret or Fallback)
    const envKey = process.env.API_KEY;
    if (!envKey) {
        console.warn("API Key is missing in environment variables!");
    }
    return envKey || "";
};

// Helper to show the user which key is active (security safe)
export const getActiveKeyMasked = (): string => {
    const key = getActiveKey();
    if (!key) return "No Key";
    if (key.length <= 4) return "****";
    return `...${key.slice(-4)}`;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const handleGeminiError = async (error: unknown, context: string, attempt: number, maxRetries: number): Promise<void> => {
  console.error(`Error calling ${context} (Attempt ${attempt}/${maxRetries}):`, error);
  
  if (error instanceof Error) {
    const msg = error.message;
    
    // Handle Rate Limits (429 / RESOURCE_EXHAUSTED)
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
        if (attempt < maxRetries) {
            console.warn(`Rate limit hit. Retrying in ${2 * attempt} seconds...`);
            await delay(2000 * attempt); // Exponential backoff: 2s, 4s, 6s...
            return; // Return to retry loop
        }
        if (context.includes("Image")) {
            throw new Error('RATE_LIMIT_EXCEEDED: 生圖配額已滿 (Image Quota Full)。請更換 Key 或等待。');
        }
        throw new Error('RATE_LIMIT_EXCEEDED: API 配額已滿 (Quota Full)。請稍後再試。');
    }

    // Handle Permissions (403 / PERMISSION_DENIED)
    if (msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
        let hint = "";
        const isFirebaseKey = getActiveKey().startsWith("AIzaSyC0");
        
        if (isFirebaseKey) {
             hint = "\n[警告] 您似乎使用了 Firebase Browser Key (AIzaSyC0...)。Gemini 生圖通常需要獨立的 Gemini API Key。";
        } else if (msg.includes("BILLING_DISABLED") || context.includes("Image")) {
            hint = "\n[常見原因]：\n1. 專案未連結帳單 (Billing Account)。生圖模型通常需要付費帳號。\n2. **API 限制設定錯誤**：請檢查 GCP Console > Credentials > API Key > **API restrictions** 分頁，確保已勾選 'Generative Language API'。";
        } else {
            hint = "\n原因是：Key 不正確、專案未連結帳單、或網域限制(Referrer)阻擋了請求。";
        }

        throw new Error(`PERMISSION_DENIED (403): 權限被拒。${hint}

【解決方法】
1. 請點擊下方的 **「🔑 更新/輸入 API Key」** 按鈕。
2. 如果您是用付費 Key，請確保 GCP 專案已連結信用卡。
3. 檢查 GCP Console 金鑰設定底部的 **「API restrictions」** 分頁。

目前使用的 Key 結尾是：${getActiveKeyMasked()}`);
    }

    throw new Error(`${context} Error: ${msg}`);
  }
  throw new Error(`An unknown error occurred while communicating with the ${context}.`);
};

// NEW: Function to validate key connectivity explicitly
export const validateGeminiKey = async (apiKey: string): Promise<{ valid: boolean; message: string }> => {
    if (!apiKey || apiKey.length < 10) return { valid: false, message: "Key 格式無效 (太短)" };
    
    try {
        const ai = new GoogleGenAI({ apiKey });
        // Use flash model for cheap/fast check of basic connectivity
        await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: "Hello" }] },
        });
        return { valid: true, message: "連線成功！API Key 有效 (文字模型)。\n注意：若生圖仍失敗，通常是 GCP 專案的 Billing 未啟用，或 API 限制 (API Restrictions) 未包含 Generative Language API。" };
    } catch (error: any) {
        console.error("Key Validation Error:", error);
        let msg = error.message || "未知錯誤";
        
        if (msg.includes("API_KEY_INVALID")) msg = "無效的 API Key (API_KEY_INVALID)。請重新複製。";
        else if (msg.includes("PERMISSION_DENIED")) msg = "權限被拒 (403)。\n請檢查：\n1. 網域限制 (Application restrictions)\n2. **API 限制 (API restrictions)** 是否包含 Generative Language API。";
        else if (msg.includes("BILLING_DISABLED")) msg = "專案未啟用計費 (Billing)。";
        else if (msg.includes("RESOURCE_EXHAUSTED")) msg = "配額已滿 (429)。";
        
        return { valid: false, message: `驗證失敗: ${msg}` };
    }
};

export const generateImageWithGemini = async (
  prompt: string,
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | null
): Promise<{ imageUrl: string }> => {
  
  const apiKey = getActiveKey();
  if (!apiKey) throw new Error("API Key is missing. Please set a custom key.");
  
  const ai = new GoogleGenAI({ apiKey });
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const config: any = {};
        if (aspectRatio) {
            config.imageConfig = { aspectRatio: aspectRatio };
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: prompt }] },
          config: config,
        });

        let resultImageUrl = '';
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    resultImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    break; 
                }
            }
        }

        if (!resultImageUrl) throw new Error('No image generated.');
        return { imageUrl: resultImageUrl };

      } catch (error: any) {
         await handleGeminiError(error, "Gemini 2.5 Image API", attempt, maxRetries);
      }
  }
  throw new Error("Failed to generate image after retries.");
};

export const editImageWithGemini = async (
  images: GeminiImagePart[],
  prompt: string
): Promise<{ response: GenerateContentResponse }> => {
  const apiKey = getActiveKey();
  if (!apiKey) throw new Error("API Key is missing. Please set a custom key.");
  const ai = new GoogleGenAI({ apiKey });
  const maxRetries = 3;

  const imageParts = images.map(image => ({
      inlineData: { data: image.base64Data, mimeType: image.mimeType },
  }));
  const textPart = { text: prompt };
  const allParts = [...imageParts, textPart];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image', 
          contents: { parts: allParts },
        });
        return { response };

      } catch (error: any) {
          await handleGeminiError(error, "Gemini 2.5 Image API", attempt, maxRetries);
      }
  }
  throw new Error("Failed to edit image after retries.");
};

export const refinePrompt = async (
    prompt: string, 
    image: GeminiImagePart | null = null, 
    language: string = 'en'
): Promise<string> => {
  const apiKey = getActiveKey();
  if (!apiKey) return prompt; 
  
  const ai = new GoogleGenAI({ apiKey });
  try {
    let systemInstruction = "";
    if (image) {
         systemInstruction = "You are an expert prompt engineer for AI image editing. I will provide you with an image and a user request. Your task is to analyze the image's subject, style, and composition, and then write a detailed, descriptive prompt that incorporates the user's request into the scene naturally. The output should be a single paragraph description of the final desired image. Output ONLY the refined prompt text.";
    } else {
         systemInstruction = "You are an expert prompt engineer for AI image generation. Rewrite the user's prompt to be more descriptive, detailed, and effective for an AI image generator. Keep the core intent but enhance the artistic style and lighting descriptions. Output ONLY the refined prompt text without any explanations.";
    }
    if (language === 'zh') {
        systemInstruction += " Please output the result in Traditional Chinese (繁體中文).";
    }

    const contents = [];
    if (image) {
        contents.push({
            inlineData: { data: image.base64Data, mimeType: image.mimeType }
        });
        contents.push({ text: `User Request: ${prompt}` });
    } else {
        contents.push({ text: prompt });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: { role: 'user', parts: contents },
      config: { systemInstruction: systemInstruction, temperature: 0.7 }
    });
    return response.text?.trim() || prompt;
  } catch (error) {
    console.error("Error calling Gemini API for refinement:", error);
    return prompt; 
  }
};

// NEW: Video Prompt Generation
export const generateVideoPrompt = async (image: GeminiImagePart, language: string = 'en'): Promise<string> => {
    const apiKey = getActiveKey();
    if (!apiKey) return "Error: No API Key";

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = language === 'zh' 
        ? "你是一位專業的 AI 影片提示詞工程師。請分析這張圖片，並撰寫一段高品質的影片生成提示詞（適用於 Sora, Runway, Kling 等模型）。"
        : "You are an expert AI video prompt engineer. Analyze this image and write a high-quality prompt for video generation models (like Sora, Runway, Kling).";

    const promptText = language === 'zh'
        ? "請描述這張圖的主體、動作、運鏡方式（如平移、推軌、環繞）、光影與氛圍。輸出格式：[主體描述] + [動作描述] + [運鏡與視角] + [風格與氛圍]。請用繁體中文輸出。"
        : "Describe the subject, action, camera movement (pan, dolly, orbit), lighting, and atmosphere. Output format: [Subject] + [Action] + [Camera] + [Style].";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                role: 'user',
                parts: [
                    { inlineData: { data: image.base64Data, mimeType: image.mimeType } },
                    { text: promptText }
                ]
            },
            config: { systemInstruction: systemInstruction, temperature: 0.5 }
        });
        return response.text?.trim() || "Failed to generate prompt.";
    } catch (error) {
        console.error("Error generating video prompt:", error);
        return "Error generating video prompt.";
    }
};

// NEW: Generate Poetic Text for Watermark
export const generatePoeticText = async (
    style: string,
    languageLabel: string,
    imagePart?: GeminiImagePart
): Promise<string> => {
    const apiKey = getActiveKey();
    if (!apiKey) throw new Error("No API Key");
    const ai = new GoogleGenAI({ apiKey });

    // Determine specific language instructions
    let languageInstruction = "";
    let formatInstruction = "";

    if (languageLabel.includes("純中文")) {
        languageInstruction = "Use Traditional Chinese (繁體中文).";
        formatInstruction = `
        Format:
        Line 1: Title (2-4 chars)
        Line 2: Poem line 1 (5 or 7 chars)
        Line 3: Poem line 2
        Line 4: Poem line 3
        Line 5: Poem line 4
        
        Strictly follow the 5-line structure.
        `;
    } else if (languageLabel.includes("中英文")) {
        languageInstruction = "Use Traditional Chinese AND English translation.";
        formatInstruction = `
        Format:
        Line 1: Title (Chinese)
        Line 2: Title (English)
        Line 3: Poem line 1 (Chinese)
        Line 4: Poem line 1 (English Translation)
        Line 5: Poem line 2 (Chinese)
        Line 6: Poem line 2 (English Translation)
        ...and so on.
        `;
    } else {
        languageInstruction = `Use ${languageLabel}.`;
        formatInstruction = "Format: Title on line 1, then poem lines.";
    }

    const promptContent = `
    Role: You are a famous poet emulating the style of: ${style}.
    Task: Analyze the attached image visually and write a poem about it.
    
    Strict Instructions:
    1. ${languageInstruction}
    2. ${formatInstruction}
    3. Output ONLY the raw text lines. NO "Title:" labels, NO markdown code blocks, NO "Here is a poem".
    4. Be creative, visual, and capture the mood of the image.
    5. Do NOT output the text "伊凡水墨". Write a new, original poem based on the image.
    `;

    const parts: any[] = [];
    
    if (imagePart) {
        parts.push({ 
            inlineData: { 
                data: imagePart.base64Data, 
                mimeType: imagePart.mimeType 
            } 
        });
    }
    
    parts.push({ text: promptContent });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { 
                role: 'user', 
                parts: parts 
            },
            config: { 
                temperature: 0.9,
            }
        });
        
        let result = response.text?.trim();
        if (!result) throw new Error("Empty response from AI");
        
        // Clean up markdown
        result = result.replace(/^```[a-z]*\n/i, '').replace(/```$/, '').trim();
        // Remove quotes
        result = result.replace(/^["']|["']$/g, '');

        return result;

    } catch (error) {
        console.error("Poetic generation failed:", error);
        throw error; // Rethrow to let UI handle it
    }
};
