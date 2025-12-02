
import { GoogleGenAI, Modality, type GenerateContentResponse } from '@google/genai';
import type { GeminiImagePart, ImageResolution } from '../types';

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
        throw new Error(`PERMISSION_DENIED (403): 權限被拒。

【請依序檢查以下 3 點 / CHECKLIST】

1. ⚠️ **API 服務未啟用 (100% 是這個原因)**：
   您只設定了 Key 的限制，但沒有開啟服務！
   請前往 Google Cloud Console > 左側選單 "APIs & Services" > "Library" (圖書館)。
   搜尋 **"Generative Language API"**。
   點擊進入，並按下 **「啟用 (ENABLE)」** 按鈕。

2. 💳 **帳單帳戶 (Billing)**：
   如果您使用的是付費 Key，請確保該 GCP 專案已連結有效的信用卡/帳單帳戶。

3. 🔑 **Key 是否正確**：
   App 目前使用的 Key 結尾是：${getActiveKeyMasked()}
   請確認這與您 Console 上的是否一致。

Google 設定生效通常需要 2-3 分鐘，請開啟服務後稍等再試。`);
    }

    throw new Error(`${context} Error: ${msg}`);
  }
  throw new Error(`An unknown error occurred while communicating with the ${context}.`);
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
