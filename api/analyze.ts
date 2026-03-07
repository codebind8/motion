import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const { frames } = req.body;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const prompt = `
You are an expert UI animation engineer.

Analyze the animation frames and return structured JSON describing the animation.

Return ONLY JSON.
`;

    const limitedFrames = frames.slice(0, 5);

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
      throw new Error("Invalid JSON response from Gemini");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    res.status(200).json(parsed);

  } catch (error) {

    console.error("Gemini error:", error);

    res.status(500).json({
      error: "Gemini request failed",
    });
  }
}
