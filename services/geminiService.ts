import { getFunctionsInstance } from './firebaseService';
import { httpsCallable } from 'firebase/functions';
import type { GeminiImagePart, Language } from '../types';

/**
 * 智慧型圖片壓縮：
 * 如果 Base64 長度超過限制，或者解析度太高，自動縮放以節省頻寬與符合 API 規範。
 * 保持長邊 2048px 對於 AI 編輯來說已經綽綽有餘。
 */
export const compressImageIfNeeded = async (base64Data: string, mimeType: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const MAX_SIZE = 2048; // AI 不需要超過 2K 的參考圖
            let width = img.width;
            let height = img.height;

            // 只有在圖片真的很大時才縮放
            if (width <= MAX_SIZE && height <= MAX_SIZE && base64Data.length < 2 * 1024 * 1024) {
                resolve(base64Data);
                return;
            }

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64Data);
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            // 使用 jpeg 壓縮 0.8 是體積與品質的最佳平衡點
            const compressed = canvas.toDataURL('image/jpeg', 0.8);
            resolve(compressed.split(',')[1]);
        };
        img.onerror = () => resolve(base64Data);
        img.src = `data:${mimeType};base64,${base64Data}`;
    });
};

/**
 * 通用的後端呼叫函式
 */
export const callBackendGemini = async (action: string, payload: any, cost: number = 0) => {
    const functions = getFunctionsInstance();
    if (!functions) throw new Error("Firebase Functions not initialized");
    
    const callGemini = httpsCallable(functions, 'ivanGeniusTw', { timeout: 300000 });
    
    try {
        const result = await callGemini({ action, payload, cost });
        return result.data as any;
    } catch (error: any) {
        console.error("Backend Call Error:", error);
        throw new Error(error.message || "伺服器通訊失敗");
    }
};

/**
 * 使用 Gemini 生成圖片
 */
export const generateImageWithGemini = async (
    prompt: string, 
    aspectRatio: string | null, 
    modelName: string, 
    imageSize: string, 
    cost: number
) => {
    // 修正：imageSize 僅支援 gemini-3-pro-image-preview 系列模型
    const isProImageModel = modelName.includes('gemini-3-pro-image');
    const imageConfig: any = {
        aspectRatio: aspectRatio || "1:1"
    };
    
    if (isProImageModel) {
        imageConfig.imageSize = imageSize || "1K";
    }

    const payload = {
        prompt,
        modelName,
        config: {
            imageConfig
        }
    };
    const response = await callBackendGemini('generateImage', payload, cost);
    
    let imageUrl = '';
    if (response.candidates && response.candidates[0]?.content?.parts) {
        const part = response.candidates[0].content.parts.find((p: any) => p.inlineData);
        if (part?.inlineData) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    
    if (!imageUrl) throw new Error("AI 未生成圖片 (No image generated)");
    return { imageUrl };
};

/**
 * 使用 Gemini 編輯圖片 (或是基於圖片生成)
 */
export const editImageWithGemini = async (
    images: GeminiImagePart[], 
    prompt: string, 
    modelName: string = 'gemini-3-pro-image-preview', 
    imageSize: string = '1K',
    cost: number = 0
) => {
    // 在傳送前對所有圖片進行壓縮處理
    const processedImages = await Promise.all(images.map(async (img) => ({
        inlineData: {
            data: await compressImageIfNeeded(img.base64Data, img.mimeType),
            mimeType: img.mimeType.includes('png') ? 'image/jpeg' : img.mimeType 
        }
    })));

    const parts = [...processedImages];
    parts.push({ text: prompt } as any);

    // 修正：imageSize 僅支援 gemini-3-pro-image-preview 系列模型
    const isProImageModel = modelName.includes('gemini-3-pro-image');
    const imageConfig: any = {};
    
    if (isProImageModel) {
        imageConfig.imageSize = imageSize || "1K";
    }

    const payload = {
        parts,
        modelName,
        config: {
            imageConfig
        }
    };
    return await callBackendGemini('editImage', payload, cost);
};

/**
 * 優化提示詞 (Refine Prompt)
 */
export const refinePrompt = async (prompt: string, imagePart: GeminiImagePart | null, lang: Language) => {
    const isZh = lang === 'zh';
    const parts: any[] = [{ text: `Improve this image generation prompt: "${prompt}". 
    ${isZh ? 'IMPORTANT: You MUST provide the final improved prompt in Traditional Chinese (繁體中文) ONLY. Do not use English.' : 'Provide only the improved prompt text in English.'}` }];
    
    if (imagePart) {
        parts.push({
            inlineData: {
                data: await compressImageIfNeeded(imagePart.base64Data, imagePart.mimeType),
                mimeType: imagePart.mimeType
            }
        });
    }

    const payload = {
        contents: [{ role: 'user', parts }],
        modelName: 'gemini-3-flash-preview',
        config: {
            systemInstruction: isZh 
                ? "你是一位專業的 AI 提示詞工程師。請優化使用者的描述，使其生成更高品質、更具藝術感的圖片。請務必使用「繁體中文」輸出最終結果。" 
                : "You are a professional AI prompt engineer. Improve the user's description for high-quality image generation."
        }
    };
    const response = await callBackendGemini('generateText', payload, 3);
    return response.text;
};

/**
 * 生成浮水印用的詩詞
 */
export const generatePoeticText = async (writerStyle: string, language: string, imagePart?: GeminiImagePart) => {
    const isChineseForced = language.includes('中文');
    const parts: any[] = [{ text: `請根據所選作家風格 "${writerStyle}"，為這張圖片或特定主題創作一首完整的詩詞。
    
    嚴格規範：
    1. 風格邏輯：必須嚴格符合該作家的藝術特色與時代邏輯（例如：李白、杜甫、王維、蘇軾等古代詩人，必須產出對仗工整、意境深遠的絕句或古詩，絕對不要產出過長的現代白話文；現代詩人如徐志摩、席慕蓉等則使用其特有的浪漫抒情體）。
    2. 字數限制：標題加上詩句全文總字數（包含標點符號）嚴格限制在 60 個繁體中文字以內。
    3. 輸出語言：要求輸出模式為 ${language}。${isChineseForced ? '重要：請務必僅使用「繁體中文」輸出，不要夾雜簡體或英文。' : ''}
    4. 格式：必須包含一個與內容相符的標題（直接輸出文字，不要括號）。
    5. 排版範例：
       標題內容
       詩句第一行
       詩句第二行...` }];

    if (imagePart) {
        parts.push({
            inlineData: {
                data: await compressImageIfNeeded(imagePart.base64Data, imagePart.mimeType),
                mimeType: imagePart.mimeType
            }
        });
    }

    const payload = {
        contents: [{ role: 'user', parts }],
        modelName: 'gemini-3-flash-preview',
        config: {
            systemInstruction: "你是一位精通中外古今文學的詩詞大師。你的任務是模仿名家風格進行配圖詩創作。請務必確保邏輯合理、意境優美，且總字數（含標題與標點）絕對不能超過 60 字。若要求中文，則必須使用繁體中文。"
        }
    };
    const response = await callBackendGemini('generateText', payload, 3);
    return response.text;
};

/**
 * 生成影片提示詞方案
 */
export const generateVideoPrompt = async (imagePart: GeminiImagePart, params: any, lang: Language) => {
    const isZh = lang === 'zh';
    const parts: any[] = [
        { text: `Generate 3 professional video prompt schemes based on this reference image. 
        User creative ideas: ${params.userInput || 'None'}. 
        Requested camera movement: ${params.camera}.
        ${isZh ? 'IMPORTANT: You MUST output all visual descriptions, titles, sound design, and camera movement logic in Traditional Chinese (繁體中文) ONLY.' : 'Output in English.'}` },
        { 
            inlineData: { 
                data: await compressImageIfNeeded(imagePart.base64Data, imagePart.mimeType), 
                mimeType: imagePart.mimeType 
            } 
        }
    ];

    const responseSchema = {
        type: "ARRAY",
        items: {
            type: "OBJECT",
            properties: {
                title: { type: "STRING" },
                tags: { type: "ARRAY", items: { type: "STRING" } },
                visual_prompt: { type: "STRING" },
                camera_atmosphere: { type: "STRING" },
                audio_prompt: { type: "STRING" }
            },
            required: ["title", "tags", "visual_prompt", "camera_atmosphere", "audio_prompt"]
        }
    };

    const payload = {
        contents: [{ role: 'user', parts }],
        modelName: 'gemini-3-pro-preview',
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            systemInstruction: isZh 
                ? "你是一位專業的電影攝影師與 AI 提示詞工程師。請協助使用者將靜態圖片轉化為具備專業運鏡、氛圍描述與聲音設計的影片腳本構想。請務必使用「繁體中文」輸出所有內容，包括標題、標籤與描述，不要混合英文。"
                : "You are an expert cinematographer and AI prompt engineer. Help users transform static images into cinematic video concepts."
        }
    };
    const response = await callBackendGemini('generateText', payload, 3);
    try {
        const text = response.text || "";
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse video prompt JSON", e);
        return [];
    }
};
