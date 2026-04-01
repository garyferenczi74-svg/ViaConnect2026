import { NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const VISION_SYSTEM_PROMPT = `You are a supplement product identification engine for ViaConnect GeneX360.

TASK: Analyze this supplement product photo and extract ALL visible information into structured JSON.

RULES:
1. Extract EVERY piece of text visible on the label
2. For bilingual labels (EN/FR common in Canadian products), use the ENGLISH text
3. If the Supplement Facts panel is visible, extract EACH ingredient line individually
4. For proprietary blends, note the blend total and list each sub-ingredient (amount = null if not disclosed)
5. Assign confidence: "high" (clearly readable), "medium" (partially readable/inferred), "low" (guessed/unclear)
6. If you cannot read a field, set it to null. NEVER guess or hallucinate values.
7. Read the ACTUAL text on the label. If you see "Organika", brand is "Organika", NOT "Unknown Brand".

RESPOND WITH ONLY THIS JSON STRUCTURE (no markdown, no preamble):
{
  "brand": string | null,
  "productName": string | null,
  "productType": string | null,
  "claimsText": string[] | null,
  "servingSize": string | null,
  "servingsPerContainer": number | null,
  "totalCount": number | null,
  "dosagePerServing": string | null,
  "npc_npn_ndc": string | null,
  "ingredients": [
    {
      "name": string,
      "form": string | null,
      "amount": number | null,
      "unit": string | null,
      "dailyValuePercent": number | null,
      "isPartOfBlend": boolean,
      "blendName": string | null
    }
  ],
  "nonMedicinalIngredients": string[] | null,
  "allergenWarnings": string[] | null,
  "otherVisibleInfo": {
    "lotNumber": string | null,
    "expiryDate": string | null,
    "manufacturer": string | null,
    "countryOfOrigin": string | null,
    "certifications": string[] | null
  },
  "overallConfidence": "high" | "medium" | "low",
  "fieldConfidences": {
    "brand": "high" | "medium" | "low",
    "productName": "high" | "medium" | "low",
    "ingredients": "high" | "medium" | "low",
    "servingSize": "high" | "medium" | "low"
  },
  "photoType": "front_label" | "back_label" | "supplement_facts" | "mixed" | "unclear",
  "needsAdditionalPhoto": boolean,
  "additionalPhotoSuggestion": string | null
}`;

export async function POST(req: Request) {
  try {
    const { image, mediaType } = await req.json();

    if (!image || typeof image !== "string" || image.length < 100) {
      return NextResponse.json({ success: false, error: "No valid image data received." });
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ success: false, error: "AI photo identification requires an API key. Please add the supplement manually." });
    }

    console.log("supplement-vision: Processing image,", Math.round(image.length / 1024), "KB, type:", mediaType);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: VISION_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: (mediaType || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: image,
              },
            },
            { type: "text", text: "Analyze this supplement label photo. Extract all product information as JSON." },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("supplement-vision: API error", response.status, errText.substring(0, 200));
      return NextResponse.json({ success: false, error: "AI service error. Please try again." });
    }

    const data = await response.json();
    const text = data.content?.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("") || "";
    console.log("supplement-vision: Response (first 300):", text.substring(0, 300));

    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const confidenceMap = { high: 0.9, medium: 0.7, low: 0.4 };
    const confidence = confidenceMap[parsed.overallConfidence as keyof typeof confidenceMap] || 0.5;

    console.log("supplement-vision: Identified:", parsed.brand, parsed.productName, "confidence:", confidence);

    return NextResponse.json({ success: true, ocrData: parsed, confidence });
  } catch (err) {
    console.error("supplement-vision: Error:", err);
    return NextResponse.json({ success: false, error: "Failed to analyze image. Please try again or add manually." });
  }
}
