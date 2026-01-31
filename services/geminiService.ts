
import { GoogleGenAI } from "@google/genai";

// Use gemini-3-pro-preview for complex reasoning tasks involving multiple data sources and grounding.
export const generateAnalysis = async (summary: any, mascotImages?: { swoop?: string, kcWolf?: string }): Promise<any> => {
  // Always create a new instance right before making an API call to ensure the latest API key is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const textPart = {
    text: `
    You are a professional broadcast analyst for SB LIX (Chiefs vs Eagles).
    DATA: ${JSON.stringify(summary)}
    TASK: Synthesize ESPN stats with Google Search updates and visual context from provided mascot images.
    
    If mascot images are provided, use their visual characteristics (colors, energy, design) to flavor the scripts.
    
    Return JSON:
    - "mainPoints": (5-7 points)
    - "halftimeRecap": (Summary)
    - "narrationScript": (Broadcaster script)
    - "swoopScript": (A 15-20 second script for Swoop, the Philadelphia Eagles mascot. High-energy, focus on Philly strategy. Reference visual traits if an image was provided.)
    - "kcWolfScript": (A 15-20 second script for KC Wolf, the Kansas City Chiefs mascot. High-energy, focus on KC strategy. Reference visual traits if an image was provided.)
    - "keysToWin": { "team1": { "name": "Chiefs", "keys": [] }, "team2": { "name": "Eagles", "keys": [] } }
    - "combinedStats": { "passing": { "team1": "", "team2": "" }, "rushing": { "team1": "", "team2": "" }, "turnovers": { "team1": "", "team2": "" } }
  `};

  const parts: any[] = [textPart];

  // Add visual context if images are provided for script grounding
  if (mascotImages?.swoop) {
    parts.push({
      inlineData: {
        data: mascotImages.swoop.replace(/^data:image\/\w+;base64,/, ''),
        mimeType: 'image/png'
      }
    });
  }
  if (mascotImages?.kcWolf) {
    parts.push({
      inlineData: {
        data: mascotImages.kcWolf.replace(/^data:image\/\w+;base64,/, ''),
        mimeType: 'image/png'
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
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
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

export const generateMascotVideo = async (script: string, mascotName: string, imageBase64?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const videoPrompt = `A 3D cinematic animation of ${mascotName}, the NFL mascot, performing a professional halftime report. The mascot is speaking directly to the camera with expressive gestures and a vibrant energy. The setting is a futuristic, glowing sports stadium at night. Professional studio lighting, 4k resolution, high-quality character animation. The mascot should look identical to the provided reference image.`;

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
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      videoConfig.image = {
        imageBytes: cleanBase64,
        mimeType: 'image/png'
      };
    }

    let operation = await ai.models.generateVideos(videoConfig);

    // Poll for video generation completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed to return a valid URI.");
    
    // As per guidelines, we must fetch the MP4 bytes using the API key and handle the response.
    // Fetching the blob and creating an Object URL is the most reliable way to display it in a video tag.
    const urlWithKey = `${downloadLink}${downloadLink.includes('?') ? '&' : '?'}key=${process.env.API_KEY}`;
    const videoResponse = await fetch(urlWithKey);
    
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video content: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
  } catch (error) {
    console.error(`Video Generation Error for ${mascotName}:`, error);
    throw error;
  }
};
