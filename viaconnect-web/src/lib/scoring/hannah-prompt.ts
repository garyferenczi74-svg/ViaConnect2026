// Hannah agent prompt for Bio Optimization Score compute.
//
// Phase C of bundled Prompts #159 + #161. Exports:
//   HANNAH_SYSTEM_PROMPT     -- the locked system prompt string
//   buildHannahUserMessage   -- builds the JSON-string user message body
//   HannahInputBundle        -- the bundle the compute module assembles
//
// The prompt content below is the first user-facing copy this PR ships,
// so every line was authored to pass Marshall's brand scan:
//   - no em-dashes (U+2014), no en-dashes (U+2013), no emojis
//   - the score is always referred to by its exact canonical name
//   - blocked-compound dictionary is enforced via indirect language
//     (the dictionary itself lives outside this file)
//   - claims language ("HIPAA-aware" only) and education-only framing
//     are baked into the rule block below

import type { BOSTier, BOSTriggerSource } from './types';

// ---------------------------------------------------------------------------
// Bundle type assembled by the compute module and passed to Hannah.
// ---------------------------------------------------------------------------

export interface HannahInputBundle {
  user_id: string;
  display_name: string;
  trigger: {
    source: BOSTriggerSource;
    event_id?: string;
    bypass_cooldown: boolean;
  };
  tier: BOSTier;
  diagnostic_foundation: {
    caq: {
      completed: boolean;
      completed_at: string | null;
      baseline_score: number | null;
      version_number: number | null;
    };
    labs: {
      present: boolean;
      uploaded_at: string | null;
      panel_count: number;
    };
    genetics: {
      present: boolean;
      processed_at: string | null;
      panel: string | null;
    };
  };
  engagement_state: {
    nutrition: { last_engaged_at: string | null; recent_events_7d: number; recent_events_30d: number };
    supplements: { last_engaged_at: string | null; recent_events_7d: number; recent_events_30d: number };
    body_tracker: { last_engaged_at: string | null; recent_events_7d: number; recent_events_30d: number };
    wearable: { last_engaged_at: string | null; recent_events_7d: number; recent_events_30d: number };
    plug_ins: { last_engaged_at: string | null; recent_events_7d: number; recent_events_30d: number };
    helix_challenges: { last_engaged_at: string | null; recent_events_7d: number; recent_events_30d: number };
  };
  previous: {
    score: number | null;
    computed_at: string | null;
    compute_version: string | null;
  };
}

// ---------------------------------------------------------------------------
// System prompt (LOCKED)
// ---------------------------------------------------------------------------
//
// Edits below require a fresh Marshall scan + Gary sign-off because this
// text is fed verbatim into every Hannah compute and propagates through
// to the user via Hannah's explanation field.

export const HANNAH_SYSTEM_PROMPT = [
  'You are Hannah, the AI Wellness Assistant for ViaConnect. You compute the Bio Optimization Score for individual users.',
  '',
  'Tone: warm, clinically informed, motivating, plain accessible English. You are not a doctor. You never give medical advice. Your explanations are educational only. You do not provide clinical-intervention guidance, and you do not promise health outcomes.',
  '',
  'Output contract: respond with EXACTLY ONE tool call to report_bos_compute, populated with the structured JSON described in the tool schema. Do not write any preamble. Do not include any commentary outside of the tool call. The score field must obey the math rules below.',
  '',
  'Brand and safety locks (these are non-negotiable; never violate them):',
  '  1. Never use em-dashes or en-dashes. Use commas, colons, or semicolons instead.',
  '  2. Never use emojis.',
  '  3. The score is named exactly Bio Optimization Score in every reference. Do not use any other name for it.',
  '  4. Never name specific GLP, GIP, glucagon, or central appetite-modulating compounds in your output. The system maintains a separate blocked-compound dictionary; if the user message references such a compound, route around it and do not echo the name back.',
  '  5. If any GLP, GIP, or glucagon agonist is referenced in the input, do not pair it with any other agonist in your output; injectable references are the only sanctioned framing.',
  '  6. Do not state or imply that ViaConnect or its products are HIPAA Compliant, FDA-authorized, or clinically validated for any condition. Use HIPAA-aware framing only. Stay educational; the brand stance is wellness-supportive, not clinical-interventional.',
  '',
  'Score semantics:',
  '  Floor: the user CAQ-derived baseline score. The Bio Optimization Score never falls below this floor.',
  '  Ceiling: 100. The Bio Optimization Score never exceeds 100.',
  '  Engagement levers add on top of the baseline; they never push the score below the baseline.',
  '  The six engagement levers are: Nutrition, Supplements, Body Tracker, Wearable Data, Plug Ins, Helix Challenges.',
  '  Decay: if a lever has not been used recently, its contribution decays with a half-life of 7 days and reaches full decay at 14 days. Report any decay applied in the decay_applied array.',
  '',
  'Math invariant: score must equal baseline_from_caq + engagement_total within a tolerance of 0.5 points. If you compute outside this window, you have made an arithmetic error; recompute before emitting the tool call.',
  '',
  'Explanation rules:',
  '  Write 2 to 4 sentences in your own warm voice.',
  '  Address the user directly using their display_name (provided in the user message; the application resolved this via the getDisplayName helper before invoking you).',
  '  Tell the user what moved the score this compute, and what to do next. Be specific. Be kind.',
  '  Never give medical advice, never offer a clinical assessment, never promise an outcome, never mention specific dosing.',
  '',
  'If the input shows no recent engagement on any lever, encourage the user gently and suggest one concrete next step from the six levers. If the user is making strong progress, celebrate it briefly and propose one lever to focus on next.',
].join('\n');

// ---------------------------------------------------------------------------
// User message builder
// ---------------------------------------------------------------------------

/**
 * Build the user-role message content for Hannah. Returns a JSON-string
 * payload. The compute module passes this directly as the user content
 * for the Anthropic messages.create call.
 */
export function buildHannahUserMessage(input: HannahInputBundle): string {
  const payload = {
    user_id: input.user_id,
    display_name: input.display_name,
    trigger: {
      source: input.trigger.source,
      event_id: input.trigger.event_id ?? null,
      bypass_cooldown: input.trigger.bypass_cooldown,
    },
    tier: input.tier,
    diagnostic_foundation: input.diagnostic_foundation,
    engagement_state: input.engagement_state,
    previous: input.previous,
  };
  return JSON.stringify(payload);
}
