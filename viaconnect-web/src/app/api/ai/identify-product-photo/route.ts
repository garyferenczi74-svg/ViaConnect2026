import { NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const PHOTO_PROMPT = `You are an expert supplement label reader. Look at this supplement product image carefully.

READ THE ACTUAL LABEL TEXT. Extract every detail you can see:

1. BRAND NAME: Read the brand/manufacturer name printed on the label (e.g., "Organika", "Thorne", "NOW Foods"). Look at the top of the label or the most prominent text.
2. PRODUCT NAME: The specific product name (e.g., "8-in-1 Magnesium", "Basic Nutrients 2/Day"). Usually the largest text on the front.
3. FORMULATION: Key claims or description text on the label (e.g., "synergistic magnesium complex + Vitamin B6").
4. DOSAGE: How much to take and the amount per serving. Look for "Serving Size" on the Supplement Facts panel.
5. DOSAGE FORM: What form is it? Read from label: "capsules", "tablets", "softgels", "powder", "vegetarian capsules".
6. COUNT: Total count in the bottle (e.g., "90 capsules", "60 tablets").
7. KEY INGREDIENTS: Read from the Supplement Facts panel if visible, or from the front label.

RETURN FORMAT (JSON only, no preamble):
{
  "found": true,
  "identifiedFrom": "photo",
  "product": {
    "name": "exact product name from label",
    "brand": "exact brand name from label",
    "fullName": "brand + product name",
    "servingSize": "serving size from label",
    "servingsPerContainer": null,
    "recommendedDose": "dosage instructions from label",
    "recommendedFrequency": "once_daily",
    "ingredients": [
      { "name": "ingredient name with form", "amount": 0, "unit": "mg", "dailyValuePercent": null, "activeForm": "", "category": "standard_actives" }
    ],
    "otherIngredients": [],
    "allergenWarnings": [],
    "confidence": 0.85,
    "photoNotes": "what was readable from the label"
  }
}

CATEGORY OPTIONS: standard_actives, liposomal_delivery, micellar_delivery, methylated_vitamins, minerals_cofactors, amino_acids, peptides, plant_extracts_botanicals, enzymes_probiotics, specialty_compounds

CRITICAL RULES:
- Read the ACTUAL text on the label. Do NOT guess or use generic defaults.
- If you can read "Organika" on the label, brand is "Organika", NOT "Unknown Brand".
- If you can read "8-in-1 Magnesium", name is "8-in-1 Magnesium", NOT "Supplement".
- If you can read "212mg", use "212mg", NOT "500mg".
- Be EXACT with amounts from the Supplement Facts panel.
- If the image is too blurry or not a supplement, return {"found":false,"error":"reason"}
Return ONLY valid JSON.`;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const photos = formData.getAll("photos") as File[];

    if (!photos.length) {
      return NextResponse.json({ found: false, error: "No photos provided" });
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({
        found: false,
        error: "AI photo identification requires an API key. Please add the supplement manually using the search bar.",
      });
    }

    // Convert photos to base64
    const imageContents = await Promise.all(
      photos.map(async (photo) => {
        const buffer = await photo.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        console.log("identify-product-photo: Processing image", photo.name, photo.type, Math.round(buffer.byteLength / 1024) + "KB");
        return {
          type: "image" as const,
          source: { type: "base64" as const, media_type: (photo.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64 },
        };
      })
    );

    console.log("identify-product-photo: Calling Claude Vision API with", imageContents.length, "image(s)");

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
        messages: [{
          role: "user",
          content: [...imageContents, { type: "text", text: PHOTO_PROMPT }],
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("identify-product-photo: API error", response.status, errText.substring(0, 300));
      return NextResponse.json({
        found: false,
        error: response.status === 401 ? "AI service authentication failed. Contact support."
          : response.status === 429 ? "AI service is busy. Please try again in a moment."
          : "AI service error. Please try again or add manually.",
      });
    }

    const data = await response.json();
    const textContent = data.content
      ?.filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("") || "";

    console.log("identify-product-photo: Claude response (first 300 chars):", textContent.substring(0, 300));

    const cleaned = textContent.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);

    if (result.found === false || result.error) {
      return NextResponse.json({ found: false, error: result.error || "Could not identify supplement from photo." });
    }

    console.log("identify-product-photo: Identified:", result.product?.brand, result.product?.name);

    return NextResponse.json(result);
  } catch (err) {
    console.error("identify-product-photo: Error:", err);
    return NextResponse.json({
      found: false,
      error: "Could not identify the product from the photo. Try a clearer image or search by name.",
    });
  }
}
