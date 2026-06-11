// Prompt 187 Task 2: zod schema for Hannah's structured analysis output.
//
// The analyze edge function (Deno runtime) carries an IDENTICAL schema and
// validates Hannah's JSON before writing nutrition_genetic_findings rows.
// The two copies cannot share an import across runtimes, so field names and
// constraints here must stay in lockstep with the edge function copy.
// snake_case field names match the nutrition_genetic_findings columns on
// purpose.

import { z } from 'zod';

// kebab-case: lowercase alphanumeric segments joined by single hyphens.
const KEBAB_CASE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const HannahAnalysisSchema = z.object({
  summary: z.string(),
  findings: z
    .array(
      z.object({
        category: z.enum(['food', 'vitamin', 'mineral', 'other']),
        item_name: z.string().min(1).max(120),
        item_slug: z.string().regex(KEBAB_CASE_SLUG),
        direction: z.enum(['need', 'avoid', 'neutral', 'unknown']),
        strength: z.enum(['strong', 'moderate', 'weak']),
        confidence: z.enum(['high', 'medium', 'low']),
        estimated: z.boolean(),
        rationale: z.string().min(1).max(300),
      }),
    )
    .max(60),
});

export type HannahAnalysis = z.infer<typeof HannahAnalysisSchema>;
