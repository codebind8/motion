import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const { frames } = req.body;

    console.log("Frames received:", frames?.length);

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API key missing"
      });
    }

    if (!frames || frames.length === 0) {
      return res.status(400).json({
        error: "No frames received"
      });
    }

    // 🔥 IMPORTANT: reduce payload size
    const limitedFrames = frames.slice(0, 1);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
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

Return ONLY JSON.
`;

    const parts = [
      { text: prompt },
      ...limitedFrames.map((frame) => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: frame.split(",")[1],
        },
      })),
    ];

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts
        }
      ]
    });

    const text = result.response.text();

    console.log("Gemini raw response:", text);

    // safer JSON extraction
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1) {
      throw new Error("Gemini did not return JSON");
    }

    const json = text.slice(start, end + 1);

    const parsed = JSON.parse(json);

    return res.status(200).json(parsed);

  } catch (error) {

    console.error("Gemini error:", error);

    return res.status(500).json({
      error: "Gemini request failed",
      details: error.message || "Unknown error"
    });

  }

}
