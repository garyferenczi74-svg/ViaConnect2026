// Prompt 192 Task 2: Gordon composition layer.
//
// Two implementations of InsightComposer:
//   templateComposer: deterministic, fact driven copy in Gordon's voice
//     (warm, direct, not preachy, progress over perfection). Used as the
//     fallback AND in tests. Every number in the copy comes from the fact
//     snapshot verbatim; templates never invent values.
//   claudeComposer: factory over an injected Anthropic style client
//     (server only by usage; nothing here touches the network on its own).
//     Returns null on ANY failure so the engine falls back to the template:
//     copy must never block generation.
//
// Copy discipline: no dashes of any kind in user facing strings (commas,
// colons, semicolons only), no emojis, never the word Vitality, and the
// only bioavailability figure ever permitted is the verbatim string
// "Maximum Bioavailability".

import type { ComposedCopy, InsightComposer, InsightFact } from './types';

function num(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '?';
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

// Formatting normalization, not a compliance rewrite: replaces em dashes
// (u2014), en dashes (u2013), and hyphens with spaces so user facing strings
// stay dash free even when a snapshot field (for example a legacy
// interaction string) carries a hyphen. Unicode escapes keep this source
// file itself free of dash characters.
function sanitizeCopy(text: string): string {
  return text
    .replace(/[\u2013\u2014-]/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

const FOOD_SOURCES: Record<string, string> = {
  iron_mg: 'lentils, spinach, and red meat',
  magnesium_mg: 'pumpkin seeds, almonds, and black beans',
  potassium_mg: 'bananas, potatoes, and white beans',
  calcium_mg: 'yogurt, sardines, and leafy greens',
  zinc_mg: 'oysters, beef, and pumpkin seeds',
  vitamin_c_mg: 'citrus, bell peppers, and strawberries',
  vitamin_d_mcg: 'salmon, egg yolks, and fortified milk',
};

const TIMING_PATTERN_COPY: Record<string, { title: string; sentence: string }> = {
  late_eating: {
    title: 'Dinner keeps running late',
    sentence: 'your last meal landed at 9 pm or later',
  },
  long_daytime_gap: {
    title: 'Long stretches between meals',
    sentence: 'there was a gap of more than 8 hours between meals',
  },
  skipped_breakfast: {
    title: 'Breakfast went missing a few times',
    sentence: 'no breakfast made it into the log',
  },
  protein_back_loaded: {
    title: 'Most of your protein arrives at dinner',
    sentence: 'the bulk of your protein landed in the evening',
  },
};

const MOVER_LABELS: Record<string, string> = {
  macro_gap: 'closing your recurring macro gap',
  micronutrient_gap: 'shoring up a recurring micronutrient shortfall',
  meal_timing_pattern: 'smoothing out your meal timing',
  hydration_correlation: 'getting hydration to target',
  supplement_meal_alignment: 'tightening supplement timing around meals',
  quality_trend: 'steadying your meal quality',
};

function composeFromTemplate(fact: InsightFact): ComposedCopy {
  const s = fact.snapshot;
  switch (fact.type) {
    case 'macro_gap': {
      const macro = str(s.macro) || 'protein';
      if (fact.horizon === 'daily') {
        return {
          title: `Yesterday ran light on ${macro}`,
          body: `You logged ${num(s.actualG)} g of ${macro} against your ${num(s.targetG)} g target, about ${num(s.attainmentPct)}% of the way there. One solid choice today closes most of that gap. Progress over perfection.`,
        };
      }
      return {
        title: `${macro} kept coming up short this week`,
        body: `Your ${macro} landed under target on ${num(s.gapDays)} of ${num(s.coveredDays)} tracked days, averaging ${num(s.avgAttainmentPct)}% of your ${num(s.targetG)} g goal. A small repeatable add, an extra serving at one meal, moves this fast.`,
      };
    }
    case 'micronutrient_gap': {
      const label = str(s.nutrientLabel) || 'this nutrient';
      const foods = FOOD_SOURCES[str(s.nutrientKey)] ?? 'a wider mix of whole foods';
      let body = `Across your last ${num(s.coveredDays)} fully logged days, ${label} came in under the general adult reference on ${num(s.gapDays)} of them, averaging ${num(s.avgIntake)} ${str(s.unit)} against a reference of ${num(s.referenceIntake)} ${str(s.unit)}. Foods rich in ${label} include ${foods}. Small steady sources beat big rare ones.`;
      if (fact.productSuggestion) {
        body += ` If you want a supplement route, ${fact.productSuggestion.name} is one option to read up on in the shop.`;
      }
      return { title: `Worth a look: ${label} intake`, body };
    }
    case 'meal_timing_pattern': {
      const copy = TIMING_PATTERN_COPY[str(s.pattern)] ?? {
        title: 'A meal timing pattern showed up',
        sentence: 'a recurring timing pattern showed up',
      };
      return {
        title: copy.title,
        body: `On ${num(s.patternDays)} of your last ${num(s.daysWithMeals)} logged days, ${copy.sentence}. Worth a glance at the day's shape; small shifts in timing tend to carry the rest.`,
      };
    }
    case 'hydration_correlation': {
      if (fact.horizon === 'daily') {
        return {
          title: 'Hydration came in low yesterday',
          body: `You logged ${num(s.totalMl)} ml against a ${num(s.targetMl)} ml target, about ${num(s.attainmentPct)}%. A bottle within reach at the start of the day usually moves this without any willpower involved.`,
        };
      }
      const co = (s.coOccurrence ?? {}) as Record<string, unknown>;
      return {
        title: 'Hydration and food quality moved together',
        body: `Your hydration averaged ${num(s.avgAttainmentPct)}% of target this week, under target on ${num(s.daysBelowTarget)} of ${num(s.coveredDays)} logged days. Lower hydration days and lower quality days showed up together on ${num(co.lowHydrationLowQualityDays)} of ${num(co.comparedDays)} compared days. A pattern worth watching, not a verdict.`,
      };
    }
    case 'supplement_meal_alignment': {
      if (s.kind === 'interaction') {
        const i = (s.interaction ?? {}) as Record<string, unknown>;
        return {
          title: `Timing note: ${str(i.interactsWith)} and ${str(i.foodItem)}`,
          body: `${str(i.description)}. ${str(i.recommendation)}. A small spacing change keeps both doing their job.`,
        };
      }
      return {
        title: `A little fat goes with ${str(s.supplement)}`,
        body: `${str(s.supplement)} is fat soluble, and your ${str(s.timingBucket)} meals yesterday came to about ${num(s.bucketFatG)} g of fat. Taking it alongside a meal with some fat, even a spoonful of nut butter, lets it do its job.`,
      };
    }
    case 'quality_trend': {
      const contributor = s.contributor as { macro?: string; deltaPct?: number } | null;
      const contributorSentence =
        contributor && contributor.macro
          ? ` The biggest driver looks like ${contributor.macro}, which moved ${num(Math.abs(contributor.deltaPct ?? 0))} percentage points.`
          : '';
      if (s.trend === 'improving') {
        return {
          title: 'Your meal quality is trending up',
          body: `Daily quality averaged ${num(s.secondHalfAvg)} across recent days, up from ${num(s.firstHalfAvg)} earlier in the week, a gain of ${num(s.deltaPts)} points.${contributorSentence} Whatever you changed, it is working.`,
        };
      }
      if (s.trend === 'declining') {
        return {
          title: 'Meal quality slipped this week',
          body: `Daily quality averaged ${num(s.secondHalfAvg)} across recent days, down from ${num(s.firstHalfAvg)} earlier in the week, a dip of ${num(Math.abs(Number(s.deltaPts) || 0))} points.${contributorSentence} One steady day resets the slope. No drama, just data.`,
        };
      }
      return {
        title: 'Meal quality held steady',
        body: `Daily quality held around ${num(s.secondHalfAvg)} this week, compared with ${num(s.firstHalfAvg)} earlier.${contributorSentence} Consistency like this is the platform the next gain stands on.`,
      };
    }
    case 'consistency_streak': {
      return {
        title: `${num(s.streakDays)} days of logging in a row`,
        body: `You have logged meals ${num(s.streakDays)} days straight. That habit is the engine behind every other number here. Keep it rolling.`,
      };
    }
    case 'score_mover': {
      const label = MOVER_LABELS[str(s.winnerType)] ?? 'one focused change';
      return {
        title: 'Your biggest score mover this week',
        body: `Of everything in your week, the single factor with the most room to move your nutrition score is ${label}. One focused change there likely beats spreading effort everywhere at once.`,
      };
    }
    default: {
      return {
        title: 'A nutrition note from Gordon',
        body: 'New data came in this week. Open your nutrition hub for the details.',
      };
    }
  }
}

export const templateComposer: InsightComposer = {
  compose: async (fact: InsightFact): Promise<ComposedCopy> => {
    const copy = composeFromTemplate(fact);
    return { title: sanitizeCopy(copy.title), body: sanitizeCopy(copy.body) };
  },
};

// Minimal structural surface of @anthropic-ai/sdk's client (an existing
// dependency); the real Anthropic instance satisfies this, and tests inject
// a plain object. Keeping the type structural avoids importing the SDK at
// module load in the pure core.
export interface MinimalAnthropicClient {
  messages: {
    create(args: {
      model: string;
      max_tokens: number;
      system: string;
      messages: Array<{ role: 'user'; content: string }>;
    }): Promise<unknown>;
  };
}

const DEFAULT_INSIGHT_MODEL = 'claude-haiku-4-5';
const MAX_COPY_TOKENS = 300;

const COMPOSER_SYSTEM_PROMPT = [
  'You are Gordon, the FarmCeutica nutrition coach. Write one short insight from the structured facts you are given.',
  'Voice: warm, direct, not preachy. Progress over perfection. Plain language.',
  'Hard rules:',
  'Never invent numbers. Use only the numbers present in the facts, verbatim.',
  'Never diagnose, never name diseases, never claim anything treats, prevents, or fixes a condition.',
  'Never state a bioavailability fold-number. Use the exact string "Maximum Bioavailability", and only when the facts reference a product.',
  'Never mention products unless the facts include a productSuggestion, and then only in educational framing alongside food sources.',
  'No urgency or sales language. No discounts. No emojis. No dashes of any kind; use commas, colons, or semicolons.',
  'If the facts are correlational, describe patterns that appear together; never claim one caused the other.',
  'Respond with strict JSON only: {"title": string, "body": string}. Title under 60 characters, body under 320 characters.',
].join('\n');

export function claudeComposer(
  client: MinimalAnthropicClient,
  opts?: { model?: string },
): InsightComposer {
  const model = opts?.model ?? DEFAULT_INSIGHT_MODEL;
  return {
    compose: async (fact: InsightFact): Promise<ComposedCopy | null> => {
      try {
        const response = await client.messages.create({
          model,
          max_tokens: MAX_COPY_TOKENS,
          system: COMPOSER_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: JSON.stringify({
                type: fact.type,
                horizon: fact.horizon,
                severity: fact.severity,
                facts: fact.snapshot,
                productSuggestion: fact.productSuggestion ?? null,
              }),
            },
          ],
        });
        const blocks = (response as { content?: Array<{ type?: string; text?: string }> })
          ?.content;
        const text = blocks?.find((b) => typeof b?.text === 'string')?.text;
        if (!text) return null;
        const parsed = JSON.parse(text) as { title?: unknown; body?: unknown };
        if (
          typeof parsed.title !== 'string' ||
          typeof parsed.body !== 'string' ||
          parsed.title.length === 0 ||
          parsed.body.length === 0
        ) {
          return null;
        }
        return { title: sanitizeCopy(parsed.title), body: sanitizeCopy(parsed.body) };
      } catch {
        // ANY failure (network, refusal, malformed JSON) falls back to the
        // template composer at the engine layer.
        return null;
      }
    },
  };
}
