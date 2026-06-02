// Prompt 172 Phase 1B (172a): canonical meal card microcopy.
//
// Voice: knowledgeable coach who is glad you logged, grounded in Built For
// Your Biology. Not a gym buddy. No hype, no streak pressure, no scarcity
// framing, no medical claims. DSHEA verb pair loophole respected. Strings
// pass the Phase 0 clinical claim linter (see clinical-claim-lint.test.ts).
//
// Safety mode variants per 170c section 8.4 silent ratio mode contract:
// food positive, non optimization framing. Never reference calories, grams,
// scores, or quantitative targets in the safety mode variant. The macro
// chip labels reuse the same nouns in both variants because the labels read
// the same to the user; only the values flip from absolutes to ratios.
//
// Hannah review: clinical framing.
// Kelsey review: regulatory framing.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import type { MicrocopyMap } from './types';

export const MICROCOPY_STRINGS: MicrocopyMap = {
  'title.totals': {
    normal: 'Meal totals',
    safety_mode: 'Meal composition',
  },
  'title.totals_hint': {
    normal: 'Tap an item to adjust the portion or swap the food.',
    safety_mode: 'Tap an item to adjust the portion or swap the food.',
  },

  'state.analyzing': {
    normal: 'Looking at your plate...',
    safety_mode: 'Looking at your plate...',
  },
  'state.low_confidence': {
    normal: 'We got a partial read on this one. Tap to refine.',
    safety_mode: 'We got a partial read on this one. Tap to refine.',
  },
  'state.error': {
    normal: 'Something glitched on our side. Try again, or log it manually.',
    safety_mode: 'Something glitched on our side. Try again, or log it manually.',
  },
  'state.low_confidence_body': {
    normal: 'Please review the items before saving.',
    safety_mode: 'Please review the items before saving.',
  },
  'state.error_body': {
    normal: 'We were not able to analyze this photo. Please try again.',
    safety_mode: 'We were not able to analyze this photo. Please try again.',
  },

  'action.confirm': {
    normal: 'Save to log',
    safety_mode: 'Save to log',
  },
  'action.edit': {
    normal: 'Edit',
    safety_mode: 'Edit',
  },
  'action.split': {
    normal: 'Split plate',
    safety_mode: 'Split plate',
  },
  'action.cancel': {
    normal: 'Cancel',
    safety_mode: 'Cancel',
  },
  'action.save': {
    normal: 'Save to log',
    safety_mode: 'Save to log',
  },
  'action.saving': {
    normal: 'Saving...',
    safety_mode: 'Saving...',
  },
  'action.add_item': {
    normal: 'Add another item',
    safety_mode: 'Add another item',
  },

  'acknowledgement.high': {
    normal: 'Logged. Solid meal.',
    safety_mode: 'Logged. Thanks for fueling up.',
  },
  'acknowledgement.medium': {
    normal: 'Logged. Thanks for the detail.',
    safety_mode: 'Logged. Thanks for the detail.',
  },
  'acknowledgement.low': {
    normal: 'Logged. We will sharpen the read next time.',
    safety_mode: 'Logged. Thanks for trusting the log.',
  },

  'chips.calories.label': {
    normal: 'Calories',
    safety_mode: 'Calories',
  },
  'chips.protein.label': {
    normal: 'Protein',
    safety_mode: 'Protein',
  },
  'chips.carbs.label': {
    normal: 'Carbs',
    safety_mode: 'Carbs',
  },
  'chips.fats.label': {
    normal: 'Fat',
    safety_mode: 'Fat',
  },

  // 170c section 10.3 degraded service messaging. Phrased as service side
  // issues, never user fault, per spec 5.4 hard rule.
  'degraded.logmeal_hard_stop': {
    normal: 'Our primary recognition system is busy. We used a backup system for this meal. Please review carefully.',
    safety_mode: 'Our primary recognition system is busy. We used a backup system for this meal. Please review carefully.',
  },
  'degraded.gemini_low_confidence': {
    normal: 'Recognition confidence is lower than usual for this meal. Please review carefully.',
    safety_mode: 'Recognition confidence is lower than usual for this meal. Please review carefully.',
  },
  'degraded.claude_tertiary_used': {
    normal: 'Multiple recognition systems were unavailable. We used our final fallback for this meal. Please review carefully.',
    safety_mode: 'Multiple recognition systems were unavailable. We used our final fallback for this meal. Please review carefully.',
  },

  // Prompt 172 Phase 2 (172b): Bio Optimization Score line variants.
  // Voice: knowledgeable coach who is glad you logged. No hype, no
  // streak pressure, no medical claims, no diagnostic phrasing. Safety
  // mode variants drop all numeric framing and stay food positive per
  // 170c section 8.4. Score name is exactly Bio Optimization Score per
  // spec section 2 hard rule.
  'bos.positive_delta': {
    normal: 'This meal nudged your Bio Optimization Score in the right direction.',
    safety_mode: 'This meal sits well with how you have been eating.',
  },
  'bos.neutral': {
    normal: 'Steady. Your Bio Optimization Score held its line.',
    safety_mode: 'Logged. Steady choice.',
  },
  'bos.gentle_caution': {
    normal: 'Worth checking the macro mix on your next meal.',
    safety_mode: 'Logged. Thanks for logging.',
  },
  'bos.learning': {
    normal: 'We need a few more meals to read your Bio Optimization signal.',
    safety_mode: 'Logged. We are still learning your patterns.',
  },
};
