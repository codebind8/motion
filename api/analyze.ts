import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {
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

    // Updated model list — correct names as of 2025
    const modelNames = [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ];

    let result: any = null;
    const errors: string[] = [];

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
        const msg = e?.message ?? "unknown";
        console.error(`Model ${modelName} failed: ${msg}`);
        errors.push(`${modelName}: ${msg}`);
      }
    }

    if (!result) {
      // Log all failures so we can diagnose
      console.error("All models failed:", JSON.stringify(errors));
      return res.status(500).json({
        error: "All Gemini models failed",
        details: errors,
      });
    }

    const text = result.response.text();
    console.log("Response preview:", text.slice(0, 200));

    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
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
