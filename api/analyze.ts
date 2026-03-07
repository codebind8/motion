import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is not set");
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured in Vercel environment variables",
    });
  }

  try {
    // Parse body manually if needed (for Vite/Vercel non-Next.js projects)
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }

    const frames: string[] = body?.frames;

    console.log("Frames received:", frames?.length);

    if (!frames || frames.length === 0) {
      return res.status(400).json({ error: "No frames received" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `You are an expert UI animation engineer.
Analyze these animation frames and return JSON describing:
{
  "summary": "...",
  "initialState": "...",
  "midMotion": "...",
  "finalState": "...",
  "properties": [],
  "cssCode": "",
  "framerMotionCode": "",
  "gsapCode": ""
}
IMPORTANT: Return ONLY raw JSON. No markdown, no code fences, no explanation.`;

    const imageData = frames[0];
    const base64 = imageData.includes(",") ? imageData.split(",")[1] : imageData;

    const parts = [
      { text: prompt },
      { inlineData: { mimeType: "image/jpeg", data: base64 } },
    ];

    // Try models in order until one works
    const modelNames = [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash-latest",
      "gemini-pro-vision",
    ];

    let result: any = null;
    let lastError: any = null;

    for (const modelName of modelNames) {
      try {
        console.log("Trying model:", modelName);
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent({
          contents: [{ role: "user", parts }],
        });
        console.log("Success with model:", modelName);
        break;
      } catch (e: any) {
        console.error("Model failed:", modelName, e?.message);
        lastError = e;
      }
    }

    if (!result) {
      throw lastError ?? new Error("All models failed");
    }

    const text = result.response.text();
    console.log("Gemini raw response preview:", text.slice(0, 200));

    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) {
      throw new Error("Gemini did not return valid JSON: " + text.slice(0, 100));
    }

    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return res.status(200).json(parsed);

  } catch (error: any) {
    console.error("Handler error:", error?.message);
    return res.status(500).json({
      error: "Gemini request failed",
      details: error?.message ?? "Unknown error",
    });
  }
}
