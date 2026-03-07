export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured" });
  }

  try {
    // Manually read + parse body (Vite projects don't auto-parse)
    let body: any = req.body;

    if (!body || typeof body === "string") {
      const rawBody: string = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk: any) => (data += chunk));
        req.on("end", () => resolve(data));
        req.on("error", reject);
      });
      try {
        body = JSON.parse(rawBody);
      } catch {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }

    const frames: string[] = body?.frames;
    console.log("Frames received:", frames?.length);

    if (!frames || frames.length === 0) {
      return res.status(400).json({ error: "No frames received" });
    }

    // Use only the first frame to keep payload small
    const imageData = frames[0];
    const base64 = imageData.includes(",") ? imageData.split(",")[1] : imageData;
    const dataUrl = `data:image/jpeg;base64,${base64}`;

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

    const models = [
      "google/gemini-2.0-flash-thinking-exp:free",
      "meta-llama/llama-3.2-11b-vision-instruct:free",
      "qwen/qwen2-vl-7b-instruct:free",
    ];

    let responseText: string | null = null;
    const errors: string[] = [];

    for (const model of models) {
      try {
        console.log("Trying model:", model);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://motion-six-phi.vercel.app",
            "X-Title": "MotionReverse AI",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: dataUrl } },
                ],
              },
            ],
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        }

        responseText = data.choices?.[0]?.message?.content ?? null;
        if (!responseText) throw new Error("Empty response from model");

        console.log("Success with model:", model);
        break;
      } catch (e: any) {
        console.error(`Model ${model} failed:`, e?.message);
        errors.push(`${model}: ${e?.message}`);
      }
    }

    if (!responseText) {
      console.error("All models failed:", errors);
      return res.status(500).json({ error: "All models failed", details: errors });
    }

    const cleaned = responseText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) {
      throw new Error("Model did not return valid JSON: " + responseText.slice(0, 100));
    }

    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return res.status(200).json(parsed);

  } catch (error: any) {
    console.error("Handler error:", error?.message);
    return res.status(500).json({
      error: "Request failed",
      details: error?.message ?? "Unknown error",
    });
  }
}
