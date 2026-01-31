
import { GoogleGenAI } from "@google/genai";

/**
 * Resizes a base64 image to ensure it doesn't exceed API limits.
 */
const resizeImage = async (dataUrl: string, maxWidth = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(dataUrl);
  });
};

/**
 * Utility to extract mimeType and base64 data from a Data URL.
 */
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
 * Generates data-driven halftime analysis for both teams.
 */
export const generateAnalysis = async (summary: any, mascotImages?: { swoop?: string, kcWolf?: string }): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const textPart = {
    text: `
    You are a professional broadcast analyst for an NFL halftime show.
    
    HALFTIME SCORE DATA:
    - ${summary.team1.name} (${summary.team1.abbreviation}): ${summary.team1.score}
    - ${summary.team2.name} (${summary.team2.abbreviation}): ${summary.team2.score}
    
    STRICT ACCURACY RULES:
    1. You MUST use the score above. Do NOT use any other score.
    2. Reference specific team stats: ${JSON.stringify(summary.team1.stats)} vs ${JSON.stringify(summary.team2.stats)}
    
    TASK: Generate a halftime analysis and scripts for mascot avatars.
    
    CRITICAL INSTRUCTIONS FOR MASCOT SCRIPTS:
    - Start with the HALFTIME SCORE. 
    - Include 3 TACTICAL keys for the 2nd half using "/" separator.
    - Persona: Professional, high-energy sports mascot analyst.

    Return JSON format:
    {
      "mainPoints": ["Point 1", "Point 2"],
      "halftimeRecap": "Summary string",
      "narrationScript": "Full report",
      "swoopScript": "Script for ${summary.team2.name} mascot",
      "kcWolfScript": "Script for ${summary.team1.name} mascot",
      "keysToWin": { 
        "team1": { "name": "${summary.team1.name}", "keys": ["Key 1", "Key 2", "Key 3"] }, 
        "team2": { "name": "${summary.team2.name}", "keys": ["Key 1", "Key 2", "Key 3"] } 
      },
      "combinedStats": { 
        "passing": { "team1": "${summary.team1.stats?.['netPassingYards'] || 'N/A'}", "team2": "${summary.team2.stats?.['netPassingYards'] || 'N/A'}" }, 
        "rushing": { "team1": "${summary.team1.stats?.['rushingYards'] || 'N/A'}", "team2": "${summary.team2.stats?.['rushingYards'] || 'N/A'}" }, 
        "turnovers": { "team1": "${summary.team1.stats?.['turnovers'] || '0'}", "team2": "${summary.team2.stats?.['turnovers'] || '0'}" } 
      }
    }
  `};

  const parts: any[] = [textPart];

  if (mascotImages?.swoop) {
    const resized = await resizeImage(mascotImages.swoop);
    const parsed = parseImageData(resized);
    if (parsed) parts.push({ inlineData: { data: parsed.data, mimeType: parsed.mimeType } });
  }
  
  if (mascotImages?.kcWolf) {
    const resized = await resizeImage(mascotImages.kcWolf);
    const parsed = parseImageData(resized);
    if (parsed) parts.push({ inlineData: { data: parsed.data, mimeType: parsed.mimeType } });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0,
        responseMimeType: "application/json"
      },
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : text;
    const parsed = JSON.parse(cleanedJson);

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      }));

    return { ...parsed, sources };
  } catch (error: any) {
    console.error("Analysis Error Details:", error);
    throw new Error(`Analysis Generation Failed: ${error.message || "Unknown error"}`);
  }
};

/**
 * Generates a video for a specific mascot avatar using Veo 3.1.
 */
export const generateMascotVideo = async (script: string, mascotName: string, imageBase64?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const sanitizedScript = script.replace(/["\n\r]/g, '').substring(0, 300);
  const videoPrompt = `Cinematic 3D animation of ${mascotName} delivering a high-energy halftime sports report. Professional stadium background. Script: ${sanitizedScript}`;

  try {
    const videoConfig: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: videoPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    };

    if (imageBase64) {
      const resized = await resizeImage(imageBase64, 1024);
      const parsed = parseImageData(resized);
      if (parsed) {
        videoConfig.image = {
          imageBytes: parsed.data,
          mimeType: parsed.mimeType
        };
      }
    }

    let operation = await ai.models.generateVideos(videoConfig);

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("API completed but returned no video URI.");
    
    const urlWithKey = `${downloadLink}${downloadLink.includes('?') ? '&' : '?'}key=${process.env.API_KEY}`;
    const videoResponse = await fetch(urlWithKey);
    
    if (!videoResponse.ok) throw new Error(`Video stream fetch failed: ${videoResponse.statusText}`);

    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
  } catch (error: any) {
    console.error(`Video Error for ${mascotName}:`, error);
    throw new Error(`${error.message || "Internal generation error"}`);
  }
};
