
import { getFunctionsInstance } from './firebaseService';
import { httpsCallable } from 'firebase/functions';
import type { GeminiImagePart, VideoPromptResultScheme } from '../types';

// Helper to call the secure backend function
const callBackendGemini = async (action: string, payload: any, cost: number = 0) => {
    const functions = getFunctionsInstance();
    if (!functions) throw new Error("Firebase Functions not initialized");
    
    // Updated function name to ivanFinalV1 to match backend rename
    const callGemini = httpsCallable(functions, 'ivanFinalV1');
    try {
        // We do NOT pass any clientKey here. The backend must use its secret.
        const result = await callGemini({ action, payload, cost });
        return result.data as any;
    } catch (error: any) {
        console.error("Backend Call Error:", error);
        
        let errorMessage = error.message || "Unknown Error";

        // Handle CORS/Network errors which often mask the real backend error (500)
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network Error')) {
             throw new Error("連線失敗 (Network/CORS)。\n可能原因：\n1. 後端正在部署中，請稍等 2 分鐘再試。\n2. 您的網路環境阻擋了 Google Cloud 連線。");
        }

        if (errorMessage.includes('API key not valid')) {
             throw new Error("API Key 無效 (Invalid API Key)。請檢查 Firebase Secrets 設定。");
        }
        
        if (errorMessage.includes('429') || errorMessage.includes('resource-exhausted') || errorMessage.includes('Quota exceeded')) {
            throw new Error("系統忙碌中或額度不足 (Quota Exceeded)，請稍後再試。");
        }

        // Check for specific permission errors
        if (errorMessage.includes('Secret Accessor')) {
             throw new Error("後端權限不足: 請管理員至 Google Cloud IAM 給予 'Secret Manager Secret Accessor' 權限。");
        }
        
        if (errorMessage.includes('internal')) {
             errorMessage += " (請檢查 Firebase Console > Functions 記錄)";
        }

        // Pass through the actual server error message for better debugging
        throw new Error(`伺服器錯誤: ${errorMessage}`);
    }
};

export const generateImageWithGemini = async (
  prompt: string,
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | null
): Promise<{ imageUrl: string }> => {
  
  const config: any = {};
  if (aspectRatio) {
      config.imageConfig = { aspectRatio: aspectRatio };
  }
  
  const response = await callBackendGemini('generateImage', { prompt, config }, 5);

  let resultImageUrl = '';
  if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
              resultImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              break; 
          }
      }
  }

  if (!resultImageUrl) throw new Error('No image generated (Server Side).');
  return { imageUrl: resultImageUrl };
};

export const editImageWithGemini = async (
  images: GeminiImagePart[],
  prompt: string
): Promise<{ imageUrl?: string, response?: any }> => {
  
  const parts: any[] = [
      ...images.map(img => ({
          inlineData: { data: img.base64Data, mimeType: img.mimeType }
      })),
      { text: prompt }
  ];
  const response = await callBackendGemini('editImage', { parts }, 5);
  
  let resultImageUrl = '';
  if (response && response.candidates && response.candidates[0]?.content?.parts) {
        const part = response.candidates[0].content.parts.find((p: any) => p.inlineData);
        if (part?.inlineData) {
        resultImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
  }

  return { imageUrl: resultImageUrl, response };
};

export const refinePrompt = async (
    prompt: string, 
    image: GeminiImagePart | null = null, 
    language: string = 'en'
): Promise<string> => {
  
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

    const response = await callBackendGemini('generateText', {
        contents: { role: 'user', parts: contents },
        config: { systemInstruction: systemInstruction, temperature: 0.7 }
    }, 3); 

    return response.text?.trim() || prompt;
};

export const generateVideoPrompt = async (
    image: GeminiImagePart, 
    params: { userInput: string, camera: string },
    language: string = 'en'
): Promise<VideoPromptResultScheme[]> => {

    const systemInstruction = `
    You are a professional AI Film Director and Prompt Engineer.
    
    Task:
    Analyze the provided image and the user's request (if any) to create 3 distinct video generation concepts.
    
    Inputs:
    1. Image (Visual Reference)
    2. User Idea: "${params.userInput}" (If empty, infer from image)
    3. Required Camera Movement: "${params.camera}" (Must be applied to all schemes if specified)
    
    Output 3 Schemes:
    1. Cinematic / Realistic (Documentary or Movie style)
    2. Dynamic / High Motion (Action or Fast-paced style)
    3. Creative / Abstract (Dreamy, artistic, or emotional style)
    
    Output Format:
    Strictly return a JSON array with 3 objects. No markdown formatting.
    Structure:
    [
      {
        "title": "Short Creative Title",
        "tags": ["Tag1", "Tag2", "Tag3"],
        "visual_prompt": "Detailed description of the subject, action, and key visual elements.",
        "camera_atmosphere": "Specific camera movement instructions, lighting, and mood.",
        "audio_prompt": "Sound design, ambient noise, and specific sound effects."
      },
      ...
    ]
    
    Language Requirement:
    ${language === 'zh' ? 'All content MUST be in Traditional Chinese (繁體中文), except for specific technical terms if needed.' : 'All content must be in English.'}
    `;

    const response = await callBackendGemini('generateText', {
        contents: {
            role: 'user',
            parts: [
                { inlineData: { data: image.base64Data, mimeType: image.mimeType } },
                { text: "Generate the video prompt schemes." }
            ]
        },
        config: { 
            systemInstruction: systemInstruction, 
            temperature: 0.7,
            responseMimeType: "application/json"
        }
    }, 5);
    
    const text = response.text?.trim() || "";
    
    if (!text) throw new Error("Empty response");
    
    try {
        const jsonStr = text.replace(/^```json\n|\n```$/g, '');
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("JSON Parse Error", e);
        return [];
    }
};

export const generatePoeticText = async (
    style: string,
    languageLabel: string,
    imagePart?: GeminiImagePart
): Promise<string> => {
    
    let languageInstruction = "";
    let formatInstruction = "";

    if (languageLabel.includes("純中文")) {
        languageInstruction = "Use Traditional Chinese (繁體中文).";
        formatInstruction = `Format: Line 1: Title (2-4 chars), Line 2-5: Poem lines.`;
    } else {
        languageInstruction = "Use Traditional Chinese AND English translation.";
        formatInstruction = `Format: Title (CN/EN), then poem lines (CN/EN).`;
    }

    const promptContent = `
    Role: You are a famous poet emulating the style of: ${style}.
    Task: Analyze the attached image visually and write a poem about it.
    Instructions: ${languageInstruction} ${formatInstruction} Output raw text only.
    `;

    const parts: any[] = [];
    if (imagePart) {
        parts.push({ inlineData: { data: imagePart.base64Data, mimeType: imagePart.mimeType } });
    }
    parts.push({ text: promptContent });

    const response = await callBackendGemini('generateText', {
        contents: { role: 'user', parts: parts },
        config: { temperature: 0.9 }
    }, 5);
    
    let result = response.text?.trim() || "";
    if (!result) return "AI 未能生成內容，請重試。";
    
    result = result.replace(/^```[a-z]*\n/i, '').replace(/```$/, '').trim();
    return result;
};

// Export dummy functions to satisfy imports elsewhere if needed, but they are effectively removed
export const getActiveKey = (): string => "";
export const setStoredKey = (key: string) => {}; 
export const removeStoredKey = () => {}; 
export const generateWatermark = async (params: any): Promise<string> => { return ""; };
