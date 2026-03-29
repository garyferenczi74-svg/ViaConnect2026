import { NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const PHOTO_PROMPT = `You are a supplement identification AI. Analyze the product photo(s) provided.

TASK:
1. READ THE LABEL: Identify the brand name, product name, and any key claims visible
2. READ THE SUPPLEMENT FACTS: If visible, extract EVERY ingredient with its exact amount per serving, unit, and % Daily Value
3. VERIFY WITH WEB SEARCH: Search for this exact product online to confirm and fill in missing data
4. RETURN THE COMPLETE PRODUCT PROFILE

If you can identify the brand and product but CANNOT read the Supplement Facts clearly, use web search to find them.

RETURN FORMAT (JSON only, no preamble):
{
  "found": true,
  "identifiedFrom": "photo" or "photo+web_search",
  "product": {
    "name": "product name without brand",
    "brand": "manufacturer/brand name",
    "fullName": "brand + product name",
    "servingSize": "e.g., 1 capsule",
    "servingsPerContainer": null,
    "recommendedDose": "e.g., Take 1 capsule daily",
    "recommendedFrequency": "once_daily",
    "ingredients": [
      { "name": "full ingredient name with form", "amount": 0, "unit": "mg", "dailyValuePercent": null, "activeForm": "", "category": "standard_actives" }
    ],
    "otherIngredients": [],
    "allergenWarnings": [],
    "confidence": 0.85,
    "photoNotes": "notes about what was readable vs searched"
  }
}

CATEGORY OPTIONS: standard_actives, liposomal_delivery, micellar_delivery, methylated_vitamins, minerals_cofactors, amino_acids, peptides, plant_extracts_botanicals, enzymes_probiotics, specialty_compounds

CRITICAL: Be EXACT with amounts. If not found return {"found":false,"error":"reason"}
Return ONLY valid JSON.`;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const photos = formData.getAll("photos") as File[];

    if (!photos.length) {
      return NextResponse.json({ found: false, error: "No photos provided" });
    }

    if (!ANTHROPIC_API_KEY) {
      // Dev mock
      return NextResponse.json({
        found: true,
        identifiedFrom: "photo",
        product: {
          name: "Supplement (from photo)",
          brand: "Unknown Brand",
          fullName: "Unknown Brand Supplement",
          servingSize: "1 capsule",
          servingsPerContainer: null,
          recommendedDose: "As directed on label",
          recommendedFrequency: "once_daily",
          ingredients: [{ name: "Active Ingredient", amount: 500, unit: "mg", dailyValuePercent: null, activeForm: "", category: "standard_actives" }],
          otherIngredients: [],
          allergenWarnings: [],
          confidence: 0.4,
          photoNotes: "Mock response (no API key configured)",
        },
      });
    }

    // Convert photos to base64
    const imageContents = await Promise.all(
      photos.map(async (photo) => {
        const buffer = await photo.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return {
          type: "image" as const,
          source: { type: "base64" as const, media_type: (photo.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64 },
        };
      })
    );

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

    const data = await response.json();
    const textContent = data.content
      ?.filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("") || "";

    const cleaned = textContent.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      found: false,
      error: "Could not identify the product from the photo. Try a clearer image or search by name.",
    });
  }
}
