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

    // Pick 3 key frames: start, middle, end — best coverage without timeout
    const keyFrameIndices = [
      0,
      Math.floor((frames.length - 1) / 2),
      frames.length - 1,
    ];
    const keyFrames = keyFrameIndices.map((i) => frames[i]);

    const frameImages = keyFrames.map((imageData: string) => {
      const base64 = imageData.includes(",") ? imageData.split(",")[1] : imageData;
      return {
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${base64}` },
      };
    });

    console.log("Sending key frames:", frameImages.length, "of", frames.length);

    const prompt = `You are an expert UI animation engineer. I am giving you 3 key frames from an animation: the START frame, the MID frame, and the END frame. Analyze the motion between them and return ONLY a raw JSON object with this exact structure (no markdown, no code fences):

{
  "summary": "Brief description of the overall animation",
  "initialState": "Description of the element at the start frame",
  "midMotion": "Description during the animation",
  "finalState": "Description at the final frame",
  "properties": ["property1", "property2"],
  "trackedElements": [
    {
      "name": "Element name",
      "properties": ["opacity", "transform"],
      "motionPath": "Description of how this element moves across the frames"
    }
  ],
  "stepByStep": [
    "Step 1 description",
    "Step 2 description"
  ],
  "cssCode": "/* CSS keyframe animation code */",
  "framerMotionCode": "// Framer Motion React code",
  "gsapCode": "// GSAP animation code",
  "aiPrompts": {
    "chatgpt": {
      "concise": "Short ChatGPT prompt",
      "detailed": "Detailed ChatGPT prompt"
    },
    "gemini": {
      "concise": "Short Gemini prompt",
      "detailed": "Detailed Gemini prompt"
    },
    "framer": {
      "concise": "Short Framer AI prompt",
      "detailed": "Detailed Framer AI prompt"
    },
    "generic": {
      "concise": "Short generic prompt",
      "detailed": "Detailed generic prompt"
    }
  }
}`;

    const models = [
      "openrouter/free",
      "qwen/qwen2.5-vl-72b-instruct:free",
      "qwen/qwen2.5-vl-32b-instruct:free",
      "meta-llama/llama-3.2-11b-vision-instruct:free",
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
                  ...frameImages,
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
