import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { image, mediaType } = await req.json();

  if (!image) {
    return NextResponse.json({ success: false, error: "No image provided" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "AI service unavailable. Please add supplement manually." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are an expert supplement label reader. Analyze the supplement/medication label in the image and extract product information.

Return ONLY a valid JSON object with these fields:
{
  "brand": "Brand name",
  "productName": "Product name",
  "formulation": "Brief key facts (e.g., '24g protein, 5.5g BCAAs, 1g sugar per scoop')",
  "dosage": "Typical dosage (e.g., '1 scoop (30.4g)', '2 capsules daily')",
  "dosageForm": "powder|capsule|tablet|softgel|liquid|gummy|lozenge",
  "category": "Category (e.g., 'Protein', 'Multivitamin', 'Omega-3', 'Probiotic', 'Herbal', 'Mineral')",
  "keyIngredients": ["ingredient1", "ingredient2", "ingredient3"],
  "servingSize": "Serving size from label",
  "confidence": "high|medium|low"
}

If the image is blurry, not a supplement, or unreadable, return:
{ "error": "Could not identify supplement. Please try a clearer photo of the front label." }

No markdown, no backticks, no extra text. JSON only.`,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType || "image/jpeg",
                data: image,
              },
            },
            {
              type: "text",
              text: "Read this supplement label and extract the product information as JSON.",
            },
          ],
        }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    if (parsed.error) {
      return NextResponse.json({ success: false, error: parsed.error });
    }

    return NextResponse.json({ success: true, product: parsed });
  } catch (error) {
    console.error("Photo OCR error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to analyze image. Please try again or add the supplement manually.",
    });
  }
}
