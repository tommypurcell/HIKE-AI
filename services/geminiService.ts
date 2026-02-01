
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

<<<<<<< Updated upstream
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
=======
const parseImageData = (dataUrl: string) => {
  try {
    const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return null;
    return {
      mimeType: match[1],
      data: match[2].trim(),
    };
  } catch (e) {
    return null;
  }
};

/**
 * Step 1: Analyze stats and generate tactical "Keys to Win".
 */
export const generateStrategy = async (summary: any): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  
  const prompt = `
    You are a high-level NFL strategy coordinator. Analyze the halftime state:
    TEAMS: ${summary.team2.name} (Away) vs ${summary.team1.name} (Home)
    SCORE: ${summary.team2.score} - ${summary.team1.score}
    STATS: ${JSON.stringify(summary.team2.stats)} vs ${JSON.stringify(summary.team1.stats)}

    Based ONLY on these numbers, determine 3 specific tactical "Keys to Win" for each team for the second half.
    Be analytical, not hype-focused. Focus on things like "Limit the rushing yards" or "Convert more 3rd downs".
    Avoid generic cheering.

    Return ONLY JSON:
    {
      "recap": "A one-sentence analytical recap of the 1st half.",
      "keysToWin": { 
        "team1": { "name": "${summary.team1.name}", "keys": ["Key A", "Key B", "Key C"] }, 
        "team2": { "name": "${summary.team2.name}", "keys": ["Key X", "Key Y", "Key Z"] } 
>>>>>>> Stashed changes
      }
    }
  },
  required: ["halftimeRecap", "keysToWin"],
};

<<<<<<< Updated upstream
export const generateAnalysis = async (gameData: any): Promise<AnalysisResponse> => {
=======
/**
 * Step 2: Draft scripts that MUST include real stats and chosen strategy.
 */
export const generateScripts = async (summary: any, strategy: any, options: { tone: string }): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text) as AnalysisResponse;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
=======
    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    throw new Error(`Script Drafting Failed: ${error.message}`);
  }
};

/**
 * Step 3: Final Render.
 */
export const generateMascotVideo = async (script: string, mascotName: string, imageBase64?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const sanitizedScript = script.replace(/["\n\r]/g, ' ').substring(0, 300);
  const videoPrompt = `Cinematic 3D animation of the official mascot for the ${mascotName} delivering a data-driven sports report in a high-tech broadcast studio. Dynamic sports lighting. Script: ${sanitizedScript}`;

  try {
    const videoConfig: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: videoPrompt,
      config: { resolution: '720p', aspectRatio: '16:9' }
    };

    if (imageBase64) {
      const resized = await resizeImage(imageBase64, 1024);
      const parsed = parseImageData(resized);
      if (parsed) videoConfig.image = { imageBytes: parsed.data, mimeType: parsed.mimeType };
    }

    let operation = await ai.models.generateVideos(videoConfig);
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${import.meta.env.VITE_GEMINI_API_KEY}`);
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
  } catch (error: any) {
    throw new Error(`Render Failed: ${error.message}`);
>>>>>>> Stashed changes
  }
};
