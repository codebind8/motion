import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const { frames } = req.body;

    console.log("Frames received:", frames?.length);
    console.log("Gemini API key exists:", !!process.env.GEMINI_API_KEY);

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API key missing",
      });
    }

    if (!frames || frames.length === 0) {
      return res.status(400).json({
        error: "No frames received",
      });
    }

    const limitedFrames = frames.slice(0, 2);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const prompt = `
You are an expert UI animation engineer.

Analyze the animation frames and return JSON describing:
- animation summary
- initial state
- mid motion
- final state
- animation properties
- step-by-step explanation
- CSS animation code
- Framer Motion code
- GSAP animation code

Return ONLY valid JSON.
`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            ...limitedFrames.map((frame) => ({
              inlineData: {
                mimeType: "image/jpeg",
                data: frame.split(",")[1],
              },
            })),
          ],
        },
      ],
    });

    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Gemini returned invalid JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    res.status(200).json(parsed);

  } catch (error) {

    console.error("Gemini error:", error);

    res.status(500).json({
      error: "Gemini request failed",
      details: error.message,
    });
  }
}
