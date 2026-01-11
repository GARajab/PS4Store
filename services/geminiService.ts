
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateGameDescription = async (gameTitle: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a short, 2-sentence marketing description for the PlayStation game: ${gameTitle}`,
      config: {
        temperature: 0.7,
        // Fixed: Avoid setting maxOutputTokens without a thinkingBudget to prevent potential empty responses on Gemini 3 models.
      },
    });
    return response.text?.trim() || "No description available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Experience the next level of gaming on your PlayStation console.";
  }
};
