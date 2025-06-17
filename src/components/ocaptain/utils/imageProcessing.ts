import { GoogleGenAI } from "@google/genai";
import { TEAM_EXTRACTION_PROMPT } from "../config/prompts";

export const processImage = async (
  base64Image: string,
  customPrompt?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ 
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_GEMINI_APIKEY || "NEXT_PUBLIC_GOOGLE_GEMINI_APIKEY" 
  });
  
  // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
  const base64Data = base64Image.split(',')[1];
  
  const contents = [
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Data,
      },
    },
    { text: customPrompt || TEAM_EXTRACTION_PROMPT },
  ];

  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: contents,
  });
  
  return result.text || 'No response received.';
}; 