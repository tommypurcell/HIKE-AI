
import { GoogleGenAI } from "@google/genai";

export const generateAnalysis = async (summary: any): Promise<any> => {
  // Initialize right before call as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const prompt = `
    You are a professional broadcast analyst. 
    CURRENT CONTEXT: It is the 2025 Super Bowl (SB LIX) between the Kansas City Chiefs and the Philadelphia Eagles.
    
    CRITICAL INSTRUCTION: 
    1. Use GOOGLE SEARCH to find the ACTUAL halftime score and key highlights of the 2025 Super Bowl (Chiefs vs Eagles).
    2. The provided local summary (if any) is for a DIFFERENT game. DISREGARD IT if it contradicts the 2025 live data.
    3. Return a JSON object with exactly these fields:
       - "mainPoints": (array of 5-7 punchy halftime bullet points)
       - "halftimeRecap": (a 2-3 sentence summary paragraph)
       - "narrationScript": (a broadcast-ready script for an AI avatar)
       - "keysToWin": {
           "team1": { "name": "Chiefs", "keys": ["key1", "key2"] },
           "team2": { "name": "Eagles", "keys": ["key1", "key2"] }
         }
    
    Ensure the JSON is valid and only includes factual data from the 2025 game.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    const text = response.text || "";
    
    // Extract JSON from potential markdown block
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : text;
    
    const parsed = JSON.parse(cleanedJson);

    // Extract grounding chunks for source transparency
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      }));

    return { ...parsed, sources };
  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw new Error("The broadcast engine encountered an error fetching live 2025 data. Please try again.");
  }
};
