import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

export async function analyzeAnimationFrames(frames: string[]): Promise<AnimationAnalysis> {
  const model = "gemini-3-flash-preview";
  
  const imageParts = frames.map(base64 => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: base64.split(',')[1]
    }
  }));

  const prompt = `
    You are an expert UI animation engineer. 
    I have provided a sequence of 10 frames from a UI animation video. 
    Analyze these frames and provide a detailed breakdown:
    1. Animation Summary: A high-level description of the motion.
    2. Initial State: Describe the properties at Frame 1.
    3. Mid Motion: Describe what is happening around Frame 5-6.
    4. Final State: Describe the properties at Frame 10.
    5. Animation Properties: List specific properties (e.g., translateX, scale, opacity).
    6. Step-by-Step Explanation: A list of steps explaining the transition.
    7. Tracked Elements: Identify specific UI elements (e.g., "Primary Button", "Product Card", "Navigation Bar") and track their individual motion paths, depth/z-index changes, and property changes across the 10 frames.
    8. Implementation Code: Provide complete, production-ready implementation code.
       - Framer Motion (React): Generate a FULL, REUSABLE React component. Include state management (e.g., useState for active indices), navigation logic (next/prev functions), and AnimatePresence for smooth enter/exit transitions. For complex animations like stacked carousels, implement the depth effect (scaling/opacity of background cards) and proper exit/enter variants. The code should be self-contained and ready to paste.
       - CSS Keyframes: Provide a complete HTML/CSS example that demonstrates the full animation loop or state transition, including any necessary container styles for depth or perspective.
       - GSAP (JavaScript): Provide a complete JavaScript implementation, including any necessary DOM structure, state logic, and timeline-based transitions.
    9. AI Prompts: Generate structured prompts for other AI tools (ChatGPT, Gemini, Framer AI, Generic) to recreate this exact animation. For each tool, provide a "concise" and a "detailed" version.
       The prompts MUST follow this structure:
       1. Animation Type (e.g., Stacked card carousel)
       2. UI Elements (e.g., Cards with navigation arrows)
       3. Motion Behavior (e.g., Active card fades in and moves upward)
       4. Animation Properties (e.g., opacity, translateY, scale)
       5. Timing (e.g., duration: 0.4s, easing: ease-in-out)
       6. Expected Output (e.g., Generate a React component using Framer Motion)

       - ChatGPT Prompt: Focus on React/Framer Motion implementation.
       - Gemini Prompt: Focus on technical property breakdown and logic.
       - Framer AI Prompt: Focus on Framer-specific components and layout.
       - Generic AI Prompt: A tool-agnostic description of the motion and logic.

    Return the result in JSON format with the following structure:
    {
      "summary": "string",
      "initialState": "string",
      "midMotion": "string",
      "finalState": "string",
      "properties": ["string"],
      "stepByStep": ["string"],
      "trackedElements": [
        {
          "name": "string",
          "motionPath": "string",
          "properties": ["string"]
        }
      ],
      "cssCode": "string",
      "framerMotionCode": "string",
      "gsapCode": "string",
      "aiPrompts": {
        "chatgpt": { "concise": "string", "detailed": "string" },
        "gemini": { "concise": "string", "detailed": "string" },
        "framer": { "concise": "string", "detailed": "string" },
        "generic": { "concise": "string", "detailed": "string" }
      }
    }
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [...imageParts, { text: prompt }] }],
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
                properties: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["name", "motionPath", "properties"],
            },
          },
          cssCode: { type: Type.STRING },
          framerMotionCode: { type: Type.STRING },
          gsapCode: { type: Type.STRING },
          aiPrompts: {
            type: Type.OBJECT,
            properties: {
              chatgpt: {
                type: Type.OBJECT,
                properties: { concise: { type: Type.STRING }, detailed: { type: Type.STRING } },
                required: ["concise", "detailed"]
              },
              gemini: {
                type: Type.OBJECT,
                properties: { concise: { type: Type.STRING }, detailed: { type: Type.STRING } },
                required: ["concise", "detailed"]
              },
              framer: {
                type: Type.OBJECT,
                properties: { concise: { type: Type.STRING }, detailed: { type: Type.STRING } },
                required: ["concise", "detailed"]
              },
              generic: {
                type: Type.OBJECT,
                properties: { concise: { type: Type.STRING }, detailed: { type: Type.STRING } },
                required: ["concise", "detailed"]
              }
            },
            required: ["chatgpt", "gemini", "framer", "generic"]
          }
        },
        required: ["summary", "initialState", "midMotion", "finalState", "properties", "stepByStep", "trackedElements", "cssCode", "framerMotionCode", "gsapCode", "aiPrompts"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  return JSON.parse(text) as AnimationAnalysis;
}
