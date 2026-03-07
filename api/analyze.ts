import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    const { frames } = req.body;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const prompt = `
You are an expert UI animation engineer.
Analyze the animation frames and return JSON.
`;

    const result = await model.generateContent([
      prompt,
      ...frames.map((frame) => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: frame.split(",")[1],
        },
      })),
    ]);

    const text = result.response.text();

    res.status(200).json(JSON.parse(text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gemini request failed" });
  }
}
