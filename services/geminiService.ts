
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    halftimeRecap: {
      type: Type.STRING,
      description: "A professional TV broadcast recap of the first half events, momentum, and leading team.",
    },
    keysToWin: {
      type: Type.OBJECT,
      properties: {
        team1: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            keys: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        },
        team2: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            keys: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    }
  },
  required: ["halftimeRecap", "keysToWin"],
};

export const generateAnalysis = async (gameData: any): Promise<AnalysisResponse> => {
  const prompt = `
    Analyze the following first-half NFL Super Bowl data and generate a broadcast-ready halftime commercial script.
    
    Data:
    ${JSON.stringify(gameData)}
    
    Requirements:
    1. Professional TV broadcast tone.
    2. Clear, simple language suitable for an AI avatar narration.
    3. Part 1: Halftime Recap. Explain what happened for each team, who is leading and why, key drives, and standout players.
    4. Part 2: Second-Half Keys to Win. For each team, explain strategy, improvements needed, and what to keep doing well.
    5. Do not mention APIs, data sources, or technical terms. 
    6. No hype or speculation beyond what the data supports.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text) as AnalysisResponse;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
