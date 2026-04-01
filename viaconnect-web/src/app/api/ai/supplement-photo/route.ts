import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { image, mediaType } = await req.json();

    if (!image || typeof image !== "string" || image.length < 100) {
      return NextResponse.json({ success: false, error: "No valid image data received. Please try again." });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "AI photo identification requires an API key. Please add the supplement manually." });
    }

    console.log("supplement-photo: Received image,", image.length, "chars, type:", mediaType);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
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
            {
              type: "text",
              text: `You are an expert supplement label reader. Look at this supplement product image carefully.

READ THE ACTUAL LABEL TEXT. Extract every detail you can see:

1. BRAND NAME: Read the brand/manufacturer name printed on the label. Look at the top or most prominent text.
2. PRODUCT NAME: The specific product name. Usually the largest text on the front.
3. FORMULATION: Key claims or description (e.g., "synergistic magnesium complex + Vitamin B6, muscle function + bone health").
4. DOSAGE: Amount per serving with serving size (e.g., "2 capsules daily, 212mg magnesium per serving").
5. DOSAGE FORM: "capsule", "tablet", "softgel", "powder", "liquid", "gummy", "vegetarian capsule".
6. CATEGORY: "Magnesium", "Multivitamin", "Omega-3", "Protein", "Probiotic", "Vitamin D", "B Vitamin", "Herbal", "Mineral", "CoQ10", "Collagen", or "Other".
7. KEY INGREDIENTS: Main active ingredients from the Supplement Facts panel or front label.
8. COUNT: Total count (e.g., "90 capsules").
9. SUPPLY: Days supply (e.g., "45-day supply").

Return ONLY a valid JSON object:
{
  "brand": "exact brand name from label",
  "productName": "exact product name from label",
  "formulation": "key claims and description from label",
  "dosage": "amount per serving with serving size",
  "dosageForm": "capsule|tablet|softgel|powder|liquid|gummy|vegetarian capsule",
  "category": "Magnesium|Multivitamin|Omega-3|etc.",
  "keyIngredients": ["ingredient 1", "ingredient 2"],
  "count": "total count from label",
  "supply": "days supply from label",
  "servingSize": "serving size from label",
  "confidence": "high|medium|low"
}

CRITICAL: Read the ACTUAL text on the label. Do NOT guess or use generic defaults.
If you can read "Organika", brand is "Organika", NOT "Unknown Brand".
If you can read "212mg", use "212mg", NOT "500mg".

If too blurry or not a supplement, return:
{"error": "Could not identify supplement. Please try a clearer photo of the front label."}

JSON only. No markdown. No backticks.`,
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("supplement-photo: API error", response.status, errText.substring(0, 200));
      return NextResponse.json({
        success: false,
        error: response.status === 401 ? "AI service authentication failed."
          : response.status === 429 ? "AI service is busy. Please try again."
          : "AI service error. Please try again.",
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    console.log("supplement-photo: Claude response (first 300):", text.substring(0, 300));

    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.error) {
      return NextResponse.json({ success: false, error: parsed.error });
    }

    console.log("supplement-photo: Identified:", parsed.brand, parsed.productName);
    return NextResponse.json({ success: true, product: parsed });
  } catch (error) {
    console.error("supplement-photo: Error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to analyze image. Please try again or add the supplement manually.",
    });
  }
}
