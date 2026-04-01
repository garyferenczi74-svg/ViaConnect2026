import { NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const SEARCH_PROMPT = `You are a supplement research engine for ViaConnect GeneX360.

TASK: Search the web to find the COMPLETE Supplement Facts panel for this product.

SEARCH STRATEGY:
1. Search: "{brand} {product} supplement facts label"
2. Search: "{brand} {product} ingredients list"
3. Prioritize: manufacturer website > Amazon > iHerb > Well.ca > retailer sites
4. For Canadian NHP products, check Health Canada NHP database if NPN visible

EXTRACTION RULES:
1. Extract EVERY ingredient with: name, specific chemical form, amount per serving, unit
2. For proprietary blends where individual amounts are NOT disclosed:
   - Set individual amounts to null
   - Record the blend total amount
   - Flag isProprietaryBlend = true
   - List ALL sub-ingredients even without amounts
3. Include non-medicinal/inactive ingredients
4. Include allergen statements
5. Record ALL source URLs used

CROSS-VALIDATION:
- Compare web results against the OCR data provided
- Web source wins for ingredient amounts (more reliable than OCR on curved labels)
- OCR wins for visual-only data (lot numbers, expiry dates)

RESPOND WITH ONLY JSON (no markdown):
{
  "fullIngredients": [
    {
      "name": "string",
      "form": "string or null",
      "amount": "number or null",
      "unit": "string or null",
      "dailyValuePercent": "number or null",
      "isPartOfBlend": false,
      "blendName": "string or null"
    }
  ],
  "nonMedicinalIngredients": [],
  "allergenWarnings": [],
  "sourceUrls": [],
  "enrichmentConfidence": 0.92,
  "isProprietaryBlend": false,
  "proprietaryBlendDetails": null
}`;

export async function POST(req: Request) {
  try {
    const { brand, productName, ocrIngredients } = await req.json();

    if (!brand || !productName) {
      return NextResponse.json({ error: "Brand and product name required" }, { status: 400 });
    }

    if (!ANTHROPIC_API_KEY) {
      // Return OCR data as-is when no API key
      return NextResponse.json({
        fullIngredients: ocrIngredients || [],
        nonMedicinalIngredients: [],
        allergenWarnings: [],
        sourceUrls: [],
        enrichmentConfidence: 0.3,
        isProprietaryBlend: false,
        proprietaryBlendDetails: null,
      });
    }

    console.log("supplement-search: Enriching", brand, productName);

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
        system: SEARCH_PROMPT,
        messages: [{
          role: "user",
          content: `Find the complete Supplement Facts for:
Brand: ${brand}
Product: ${productName}

OCR detected these ingredients for cross-validation:
${JSON.stringify(ocrIngredients || [], null, 2)}

Search the web and return the full ingredient breakdown.`,
        }],
      }),
    });

    if (!response.ok) {
      console.error("supplement-search: API error", response.status);
      return NextResponse.json({
        fullIngredients: ocrIngredients || [],
        nonMedicinalIngredients: [],
        allergenWarnings: [],
        sourceUrls: [],
        enrichmentConfidence: 0.3,
        isProprietaryBlend: false,
        proprietaryBlendDetails: null,
      });
    }

    const data = await response.json();
    const text = data.content?.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("") || "";
    console.log("supplement-search: Response (first 300):", text.substring(0, 300));

    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    console.log("supplement-search: Found", parsed.fullIngredients?.length, "ingredients from", parsed.sourceUrls?.length, "sources");

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("supplement-search: Error:", err);
    return NextResponse.json({ error: "Enrichment failed" }, { status: 500 });
  }
}
