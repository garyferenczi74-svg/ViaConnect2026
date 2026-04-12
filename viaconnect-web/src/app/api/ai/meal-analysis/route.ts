import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const { images, mealType, dietaryContext } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'At least one image required' }, { status: 400 });
    }

    const imageContent = images.map((img: { base64: string; mediaType: string }) => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: img.mediaType || 'image/jpeg',
        data: img.base64,
      },
    }));

    const dietNote = dietaryContext
      ? `\nThe consumer follows a ${dietaryContext} diet. Flag any items that may conflict.`
      : '';

    const prompt = `You are a clinical nutritionist analyzing a meal photo. This is a ${mealType || 'meal'}.${dietNote}

Identify every visible food item. For each, provide:
- name (specific: "grilled chicken breast" not "chicken")
- portionDescription (standard serving: "1 cup", "6 oz")
- portionGrams (estimated weight)
- confidence (0-1)
- category: protein | carb | fat | vegetable | fruit | dairy | grain | beverage | other

Calculate totals:
- calories (integer) and calorieRange [low, high]
- protein, carbs, fat, fiber, sugar (grams), sodium (mg)

Estimate key micronutrients as array of { nutrient, amount, unit, dailyValuePercent }.

Rate mealQualityScore 0-100 based on nutrient density, macro balance, processed food content, variety.
List qualityFactors (short strings explaining the score).
Assess portionAssessment: small | moderate | large | very_large.
Provide analysisConfidence 0-1.

Give each item a unique id (short string like "item_1").

Respond ONLY with valid JSON matching this schema — no markdown, no preamble:
{
  "items": [{ "id": "", "name": "", "portionDescription": "", "portionGrams": 0, "confidence": 0, "category": "" }],
  "totals": { "calories": 0, "calorieRange": [0, 0], "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sugar": 0, "sodium": 0 },
  "micronutrients": [{ "nutrient": "", "amount": 0, "unit": "", "dailyValuePercent": 0 }],
  "mealQualityScore": 0,
  "qualityFactors": [],
  "portionAssessment": "",
  "analysisConfidence": 0
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [...imageContent, { type: 'text', text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('meal-analysis: Anthropic error', response.status, err);
      return NextResponse.json({ error: `Vision API error: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('meal-analysis: No JSON in response', text.substring(0, 500));
      return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error('meal-analysis: Error', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
