import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { frames } = req.body;

    console.log("Frames received:", frames?.length);

    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY is not set");
      return res.status(500).json({
        error: "Gemini API key missing — set GEMINI_API_KEY in Vercel environment variables",
      });
    }

    if (!frames || frames.length === 0) {
      return res.status(400).json({ error: "No frames received" });
    }

    const limitedFrames = frames.slice(0, 1);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // ✅ Fix: use stable model name
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `
You are an expert UI animation engineer.
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
IMPORTANT: Return ONLY raw JSON. No markdown, no code fences, no explanation.
`;

    const parts = [
      { text: prompt },
      ...limitedFrames.map((frame: string) => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: frame.includes(",") ? frame.split(",")[1] : frame,
        },
      })),
    ];

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    const text = result.response.text();
    console.log("Gemini raw response:", text);

    // ✅ Fix: strip markdown code fences if present
    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) {
      console.error("❌ Gemini response was not JSON:", text);
      throw new Error("Gemini did not return valid JSON");
    }

    const json = cleaned.slice(start, end + 1);
    const parsed = JSON.parse(json);

    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error("❌ Gemini error:", error);
    return res.status(500).json({
      error: "Gemini request failed",
      details: error?.message || "Unknown error",
    });
  }
}
