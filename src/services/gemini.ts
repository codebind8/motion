import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("Missing Gemini API key. Check VITE_GEMINI_API_KEY in Vercel.");
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

  const model = "gemini-2.0-flash";

  const imageParts = frames.map((base64) => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: base64.split(",")[1]
    }
  }));

  const prompt = `
You are an expert UI animation engineer.

I provided 10 frames from a UI animation.

Analyze them and return structured JSON containing:

1. Animation summary
2. Initial state
3. Mid motion
4. Final state
5. Animation properties (translate, scale, opacity etc.)
6. Step-by-step animation explanation
7. Tracked UI elements and their motion
8. Production ready animation code:
   - CSS keyframes
   - Framer Motion React component
   - GSAP animation
9. AI prompts to recreate this animation for:
   - ChatGPT
   - Gemini
   - Framer AI
   - Generic AI

Return ONLY JSON.
`;

  try {
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

            properties: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },

            stepByStep: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },

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

            aiPrompts: {
              type: Type.OBJECT,
              properties: {
                chatgpt: {
                  type: Type.OBJECT,
                  properties: {
                    concise: { type: Type.STRING },
                    detailed: { type: Type.STRING }
                  }
                },
                gemini: {
                  type: Type.OBJECT,
                  properties: {
                    concise: { type: Type.STRING },
                    detailed: { type: Type.STRING }
                  }
                },
                framer: {
                  type: Type.OBJECT,
                  properties: {
                    concise: { type: Type.STRING },
                    detailed: { type: Type.STRING }
                  }
                },
                generic: {
                  type: Type.OBJECT,
                  properties: {
                    concise: { type: Type.STRING },
                    detailed: { type: Type.STRING }
                  }
                }
              }
            }
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
      throw new Error("Gemini returned empty response");
    }

    return JSON.parse(text) as AnimationAnalysis;

  } catch (error) {
    console.error("Gemini analysis error:", error);
    throw new Error("Failed to analyze animation");
  }
}
