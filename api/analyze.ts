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

I provided several frames from a UI animation video.

Analyze them and return structured JSON containing:

1. Animation summary
2. Initial state
3. Mid motion
4. Final state
5. Animation properties (translate, scale, opacity etc.)
6. Step-by-step explanation
7. Tracked UI elements and their motion
8. Production ready animation code:
   - CSS keyframes
   - Framer Motion React component
   - GSAP animation
9. AI prompts to recreate the animation for:
   - ChatGPT
   - Gemini
   - Framer AI
   - Generic AI

Return ONLY JSON.
`;

    const result = await model.generateContent([
      prompt,
      ...frames.map((frame: string) => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: frame.split(",")[1],
        },
      })),
    ]);

    const text = result.response.text();

    const parsed = JSON.parse(text);

    res.status(200).json(parsed);

  } catch (error) {

    console.error("Gemini error:", error);

    res.status(500).json({
      error: "Gemini request failed",
    });
  }
}
