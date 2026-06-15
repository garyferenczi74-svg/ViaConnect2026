// Hannah agent output schema + runtime validator.
//
// Phase C of bundled Prompts #159 + #161. Hannah responds via the
// report_bos_compute Anthropic tool call. The tool schema below is fed
// to the model; the zod schema mirrors it and is used to validate the
// parsed tool input at runtime.
//
// validateHannahOutput is the only sanctioned entry point. It enforces:
//   - structural shape via HannahOutputZod
//   - score >= baseline_from_caq (floor)
//   - score <= 100 (ceiling)
//   - |score - (baseline_from_caq + engagement_total)| <= 0.5 (arithmetic invariant)
// On any failure it throws HannahOutputValidationError with a descriptive
// reason field so the compute module can decide whether to retry.

import { z } from 'zod';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const HANNAH_TOOL_NAME = 'report_bos_compute';
const SCORE_TOLERANCE = 0.5;
const EXPLANATION_MIN = 20;
const EXPLANATION_MAX = 600;
const ENGAGEMENT_LEVER_KEYS = [
  'nutrition',
  'supplements',
  'body_tracker',
  'wearable',
  'plug_ins',
  'helix_challenges',
] as const;
type LeverKey = (typeof ENGAGEMENT_LEVER_KEYS)[number];

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class HannahOutputValidationError extends Error {
  public readonly reason: string;
  constructor(reason: string) {
    super(`Hannah output failed validation: ${reason}`);
    this.name = 'HannahOutputValidationError';
    this.reason = reason;
  }
}

// ---------------------------------------------------------------------------
// zod schema (mirrors the JSON Schema below)
// ---------------------------------------------------------------------------

const contributionZod = z.object({
  current_contribution_pct: z.number(),
  velocity_pct: z.number(),
  ceiling_pct: z.number(),
  state: z.enum(['unused', 'in_use', 'at_ceiling']),
}).strict();

const decayZod = z.object({
  lever: z.enum(ENGAGEMENT_LEVER_KEYS),
  decay_factor: z.number().min(0).max(1),
  reason: z.literal('stale_engagement'),
}).strict();

export const HannahOutputZod = z.object({
  score: z.number().min(0).max(100),
  baseline_from_caq: z.number().min(0).max(100),
  engagement_total: z.number().min(0).max(100),
  engagement: z.object({
    nutrition: contributionZod,
    supplements: contributionZod,
    body_tracker: contributionZod,
    wearable: contributionZod,
    plug_ins: contributionZod,
    helix_challenges: contributionZod,
  }).strict(),
  decay_applied: z.array(decayZod),
  explanation: z.string().min(EXPLANATION_MIN).max(EXPLANATION_MAX),
}).strict();

export type HannahOutput = z.infer<typeof HannahOutputZod>;

// ---------------------------------------------------------------------------
// Anthropic tool schema
// ---------------------------------------------------------------------------

const contributionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['current_contribution_pct', 'velocity_pct', 'ceiling_pct', 'state'],
  properties: {
    current_contribution_pct: { type: 'number' },
    velocity_pct: { type: 'number' },
    ceiling_pct: { type: 'number' },
    state: { type: 'string', enum: ['unused', 'in_use', 'at_ceiling'] },
  },
} as const;

export const HANNAH_TOOL_SCHEMA: Tool = {
  name: HANNAH_TOOL_NAME,
  description:
    'Report the computed Bio Optimization Score for one user, including per-lever contributions, decay information, and a 2 to 4 sentence explanation. Emit exactly one tool call. The score must equal baseline_from_caq plus engagement_total within a tolerance of 0.5.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'score',
      'baseline_from_caq',
      'engagement_total',
      'engagement',
      'decay_applied',
      'explanation',
    ],
    properties: {
      score: { type: 'number', minimum: 0, maximum: 100 },
      baseline_from_caq: { type: 'number', minimum: 0, maximum: 100 },
      engagement_total: { type: 'number', minimum: 0, maximum: 100 },
      engagement: {
        type: 'object',
        additionalProperties: false,
        required: [
          'nutrition',
          'supplements',
          'body_tracker',
          'wearable',
          'plug_ins',
          'helix_challenges',
        ],
        properties: {
          nutrition: contributionJsonSchema,
          supplements: contributionJsonSchema,
          body_tracker: contributionJsonSchema,
          wearable: contributionJsonSchema,
          plug_ins: contributionJsonSchema,
          helix_challenges: contributionJsonSchema,
        },
      },
      decay_applied: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['lever', 'decay_factor', 'reason'],
          properties: {
            lever: { type: 'string', enum: [...ENGAGEMENT_LEVER_KEYS] },
            decay_factor: { type: 'number', minimum: 0, maximum: 1 },
            reason: { type: 'string', enum: ['stale_engagement'] },
          },
        },
      },
      explanation: {
        type: 'string',
        minLength: EXPLANATION_MIN,
        maxLength: EXPLANATION_MAX,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Runtime validator
// ---------------------------------------------------------------------------

/**
 * Parse the raw tool input emitted by Hannah, then assert the floor /
 * ceiling / arithmetic invariants. Throws HannahOutputValidationError on
 * any deviation so the compute module can retry exactly once.
 */
export function validateHannahOutput(raw: unknown): HannahOutput {
  let parsed: HannahOutput;
  try {
    parsed = HannahOutputZod.parse(raw);
  } catch (e) {
    if (e instanceof z.ZodError) {
      const first = e.issues[0];
      const where = first?.path?.join('.') || 'root';
      const why = first?.message ?? 'schema mismatch';
      throw new HannahOutputValidationError(`schema error at ${where}: ${why}`);
    }
    throw new HannahOutputValidationError('unparseable output');
  }

  if (parsed.score > 100) {
    throw new HannahOutputValidationError(`score ${parsed.score} exceeds ceiling 100`);
  }
  // Prompt 196e (2026-06-15): floor against the model's own reported
  // baseline_from_caq, not an external hardcoded value. The CAQ-baseline
  // derivation was never wired (caq.baseline_score is always null), so the old
  // external floor was a constant 50 that wrongly rejected legitimate sub-50
  // scores. Engagement is non-negative, so a well-formed output always
  // satisfies this; it stays as a defensive guard against model misbehavior.
  if (parsed.score < parsed.baseline_from_caq) {
    throw new HannahOutputValidationError(
      `score ${parsed.score} below baseline_from_caq floor ${parsed.baseline_from_caq}`,
    );
  }

  const computedTotal = parsed.baseline_from_caq + parsed.engagement_total;
  const diff = Math.abs(parsed.score - computedTotal);
  if (diff > SCORE_TOLERANCE) {
    throw new HannahOutputValidationError(
      `score ${parsed.score} disagrees with baseline_from_caq (${parsed.baseline_from_caq}) + engagement_total (${parsed.engagement_total}) beyond 0.5 tolerance (delta=${diff.toFixed(3)})`,
    );
  }

  return parsed;
}

// Internal: re-export the lever key tuple type so callers can iterate
// without redeclaring.
export type HannahLeverKey = LeverKey;
