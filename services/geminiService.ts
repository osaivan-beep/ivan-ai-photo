import { GoogleGenAI, type GenerateContentResponse } from '@google/genai';
import type { GeminiImagePart } from '../types';

// Fallback key (optional, mainly for admin testing if needed)
const DEFAULT_FALLBACK_KEY = "AIzaSyCeR52YbrlvyOqk8-cOyTwEVZ9TYRrbdCg";

// Dynamic retrieval function
export const getActiveKey = (): string => {
    try {
        const custom = localStorage.getItem('custom_gemini_api_key');
        if (custom && custom.trim().length > 10) {
            return custom.trim();
        }
    } catch (e) {
        console.warn("Failed to access localStorage", e);
    }
    // If no custom key, return default (though UI should force custom key)
    return DEFAULT_FALLBACK_KEY;
};

const handleGeminiError = (error: unknown, context: string, keySuffix: string): never => {
  console.error(`Error calling ${context}:`, error);
  let errorMessage = 'An unknown error occurred';
  
  if (error instanceof Error) {
    errorMessage = error.message;
    if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429')) {
      throw new Error(`RATE_LIMIT_EXCEEDED (Key: ...${keySuffix})`);
    }
    if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('403')) {
      throw new Error(`PERMISSION_DENIED (Key: ...${keySuffix})`);
    }
  }
  throw new Error(`${context} Error: ${errorMessage} (Key: ...${keySuffix})`);
};

// Gemini 2.5 Flash Image Generation
export const generateImageWithGemini = async (
  prompt: string,
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | null
): Promise<{ imageUrl: string }> => {
  
  const apiKey = getActiveKey();
  const keySuffix = apiKey.slice(-4);
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
    // Only pass aspect ratio if strictly provided (Text-to-Image)
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
     handleGeminiError(error, "Gemini 2.5 Image API", keySuffix);
  }
};

// Gemini 2.5 Flash Image Editing
export const editImageWithGemini = async (
  images: GeminiImagePart[],
  prompt: string
): Promise<{ response: GenerateContentResponse }> => {
  const apiKey = getActiveKey();
  const keySuffix = apiKey.slice(-4);
  const ai = new GoogleGenAI({ apiKey });

  const imageParts = images.map(image => ({
      inlineData: { data: image.base64Data, mimeType: image.mimeType },
  }));
  const textPart = { text: prompt };
  const allParts = [...imageParts, textPart];

  try {
    // Using Gemini 2.5 Flash Image
    // Note: For editing, we generally don't pass aspectRatio to let the model maintain the input image's ratio.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: { parts: allParts },
    });
    return { response };

  } catch (error: any) {
      handleGeminiError(error, "Gemini 2.5 API", keySuffix);
  }
};

// Gemini 2.5 Flash for Text (Refine Prompt)
export const refinePrompt = async (
    prompt: string, 
    image: GeminiImagePart | null = null, 
    language: string = 'en'
): Promise<string> => {
  const apiKey = getActiveKey();
  const keySuffix = apiKey.slice(-4);
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