import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("Gemini API key missing. Check VITE_GEMINI_API_KEY.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface TrackedElement {
  name: string;
  motionPath: string;
  properties: string[];
}

export interface AIPrompts {
  chatgpt: { concise: string; detailed: string };
  gemini: { concise: string; detailed: string };
  framer: { concise: string; detailed: string };
  generic: { concise: string; detailed: string };
}

export interface AnimationAnalysis {
  summary: string;
  initialState: string;
  midMotion: string;
  finalState: string;
  properties: string[];
  cssCode: string;
  framerMotionCode: string;
  gsapCode: string;
  stepByStep: string[];
  trackedElements: TrackedElement[];
  aiPrompts: AIPrompts;
}

export async function analyzeAnimationFrames(
  frames: string[]
): Promise<AnimationAnalysis> {

  const model = "gemini-1.5-flash";

  const imageParts = frames.map(base64 => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: base64.split(",")[1]
    }
  }));

  const prompt = `Analyze this UI animation sequence and return structured JSON describing the animation, motion properties, and implementation code.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [...imageParts, { text: prompt }]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          initialState: { type: Type.STRING },
          midMotion: { type: Type.STRING },
          finalState: { type: Type.STRING },
          properties: { type: Type.ARRAY, items: { type: Type.STRING } },
          stepByStep: { type: Type.ARRAY, items: { type: Type.STRING } },
          trackedElements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                motionPath: { type: Type.STRING },
                properties: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["name", "motionPath", "properties"]
            }
          },
          cssCode: { type: Type.STRING },
          framerMotionCode: { type: Type.STRING },
          gsapCode: { type: Type.STRING },
          aiPrompts: { type: Type.OBJECT }
        },
        required: [
          "summary",
          "initialState",
          "midMotion",
          "finalState",
          "properties",
          "stepByStep",
          "trackedElements",
          "cssCode",
          "framerMotionCode",
          "gsapCode",
          "aiPrompts"
        ]
      }
    }
  });

  const text = await response.text();

  if (!text) {
    throw new Error("No response from Gemini");
  }

  return JSON.parse(text) as AnimationAnalysis;
}
