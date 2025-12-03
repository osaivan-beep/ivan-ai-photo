
import { GoogleGenAI, Modality, type GenerateContentResponse } from '@google/genai';
import type { GeminiImagePart, ImageResolution } from '../types';

// Dynamic retrieval function
export const getActiveKey = (): string => {
    // 1. Try Local Storage (User provided key - BYOK) - 這是最安全的做法
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey && localKey.length > 10) return localKey;

    // 2. System Fallback REMOVED for Security
    // 為了營業安全，我們移除了從 process.env.API_KEY 讀取金鑰的功能。
    // 這防止了您的個人金鑰被打包進公開網站中被盜用。
    // 使用者必須在介面上輸入他們自己的 Key。
    return "";
};

export const setStoredKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
};

export const removeStoredKey = () => {
    localStorage.removeItem('gemini_api_key');
};

const handleGeminiError = (error: unknown, context: string): never => {
  console.error(`Error calling ${context}:`, error);
  if (error instanceof Error) {
    const msg = error.message;
    
    // 偵測額度不足
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
      throw new Error('API 額度已滿 (Rate Limit Exceeded)。請稍後再試，或更換 API Key。');
    }
    
    // 偵測 Key 無效、權限錯誤或 Key 缺失
    if (msg.includes('PERMISSION_DENIED') || msg.includes('403') || msg.includes('API key not valid') || msg.includes('API_KEY_INVALID')) {
        // 拋出特定錯誤字串，讓前端 App.tsx 可以偵測並彈出視窗
        throw new Error('API_KEY_INVALID');
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
  // 如果沒有 Key，直接拋出錯誤觸發 UI
  if (!apiKey) throw new Error("API_KEY_INVALID");

  const ai = new GoogleGenAI({ apiKey });
  
  const extractImage = (response: any) => {
      let resultImageUrl = '';
      if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
          for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                  resultImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                  break; 
              }
          }
      }
      return resultImageUrl;
  };

  try {
    // Using Gemini 2.5 Flash Image
    const config: any = {};
    if (aspectRatio) {
        config.imageConfig = { aspectRatio: aspectRatio };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: config,
    });

    const img = extractImage(response);
    if (!img) throw new Error('No image generated.');
    return { imageUrl: img };

  } catch (error: any) {
     handleGeminiError(error, "Gemini 2.5 Image API");
  }
};

export const editImageWithGemini = async (
  images: GeminiImagePart[],
  prompt: string
): Promise<{ response: GenerateContentResponse }> => {
  const apiKey = getActiveKey();
  if (!apiKey) throw new Error("API_KEY_INVALID");

  const ai = new GoogleGenAI({ apiKey });

  const imageParts = images.map(image => ({
      inlineData: { data: image.base64Data, mimeType: image.mimeType },
  }));
  const textPart = { text: prompt };
  const allParts = [...imageParts, textPart];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: { parts: allParts },
    });
    return { response };

  } catch (error: any) {
      handleGeminiError(error, "Gemini 2.5 API");
  }
};

export const refinePrompt = async (
    prompt: string, 
    image: GeminiImagePart | null = null, 
    language: string = 'en'
): Promise<string> => {
  const apiKey = getActiveKey();
  if (!apiKey) return prompt; // 若無 Key，不優化直接回傳原提示詞，避免報錯阻擋流程

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
  } catch (error: any) {
    console.error("Refine Prompt Error:", error);
    if (error.message?.includes('API_KEY_INVALID')) throw error;
    return prompt; 
  }
};

export interface WatermarkParams {
    text: string;
    subText?: string;
    style: string;
    theme?: string;
    icon?: string;
    color?: string;
}

export const generateWatermark = async (params: WatermarkParams): Promise<string> => {
    return ""; 
};

// NEW: Video Prompt Generation
export const generateVideoPrompt = async (image: GeminiImagePart, language: string = 'en'): Promise<string> => {
    const apiKey = getActiveKey();
    if (!apiKey) throw new Error("API_KEY_INVALID");

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
    } catch (error: any) {
        handleGeminiError(error, "Gemini Video Prompt");
    }
};

// NEW: Generate Poetic Text for Watermark
export const generatePoeticText = async (
    style: string,
    languageLabel: string,
    imagePart?: GeminiImagePart
): Promise<string> => {
    const apiKey = getActiveKey();
    if (!apiKey) throw new Error("API_KEY_INVALID");

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
    3. Output ONLY the raw text lines. No "Title:" labels, no markdown code blocks (like \`\`\`). DO NOT add "Here is the poem:"
    4. Be creative, visual, and capture the mood of the image.
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
        if (!result) return "AI 未能生成內容，請重試。\n(AI failed to generate content)";
        
        // Clean up markdown
        result = result.replace(/^```[a-z]*\n/i, '').replace(/```$/, '').trim();
        // Remove quotes
        result = result.replace(/^["']|["']$/g, '');

        return result;

    } catch (error: any) {
        handleGeminiError(error, "Gemini Poem Gen");
    }
};
