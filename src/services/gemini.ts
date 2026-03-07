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

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ frames }),
  });

  if (!response.ok) {
    throw new Error("Failed to analyze animation");
  }

  const data = await response.json();

  return data as AnimationAnalysis;
}
