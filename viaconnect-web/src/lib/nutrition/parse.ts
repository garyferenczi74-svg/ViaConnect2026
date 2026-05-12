// Prompt #160 section 5.5: Parse + Zod-validate the raw Claude response.
// Throws on any parse or schema error so the route handler can return 502.

import { NutritionAnalysisSchema, type NutritionAnalysis } from './schema';

export function parseNutritionResponse(raw: string): NutritionAnalysis {
  // Strip optional markdown fences defensively even though the system prompt
  // forbids them; Claude occasionally returns them on edge cases.
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  return NutritionAnalysisSchema.parse(parsed);
}
