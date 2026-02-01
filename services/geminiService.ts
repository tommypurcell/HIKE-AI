
import { GoogleGenAI } from "@google/genai";

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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
      }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    throw new Error(`Strategy Generation Failed: ${error.message}`);
  }
};

/**
 * Step 2: Draft scripts that MUST include real stats and chosen strategy.
 */
export const generateScripts = async (summary: any, strategy: any, options: { tone: string }): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Generate TWO distinct 100-word halftime scripts for sports mascot avatars.
    
    AWAY TEAM: ${summary.team2.name} (Score: ${summary.team2.score})
    AWAY STATS: ${JSON.stringify(summary.team2.stats)}
    AWAY STRATEGY: ${strategy.keysToWin.team2.keys.join(', ')}

    HOME TEAM: ${summary.team1.name} (Score: ${summary.team1.score})
    HOME STATS: ${JSON.stringify(summary.team1.stats)}
    HOME STRATEGY: ${strategy.keysToWin.team1.keys.join(', ')}

    INSTRUCTIONS:
    1. Each script MUST start by stating the current halftime score.
    2. Each script MUST mention at least TWO specific numerical statistics from the provided data (e.g. rushing yards, net passing, turnovers). Do NOT make up numbers.
    3. Each script MUST explicitly mention at least ONE of the tactical keys to win defined in the strategy.
    4. AVOID generic "Let's go" or "Let's fight" filler. Use professional TV broadcast analysis tone.
    5. TONE: ${options.tone}.

    Return JSON:
    {
      "awayScript": "Script for ${summary.team2.name} mascot.",
      "homeScript": "Script for ${summary.team1.name} mascot."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    throw new Error(`Script Drafting Failed: ${error.message}`);
  }
};

/**
 * Step 3: Final Render.
 */
export const generateMascotVideo = async (script: string, mascotName: string, imageBase64?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
  } catch (error: any) {
    throw new Error(`Render Failed: ${error.message}`);
  }
};
