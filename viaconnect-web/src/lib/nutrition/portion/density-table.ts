// Prompt #170 Phase 1f: food density lookup table.
//
// The volume estimator multiplies an estimated volume (mL) by a density
// (g/mL) to get mass. Phase 1 uses bucket densities; the curated per-food
// seed in 170b will refine values. Buckets are walked in order: first hit
// wins, then fallback to the unknown bucket.
//
// Bucket ordering matters where a name contains both a category cue and an
// ingredient cue (e.g. "chicken curry" must hit mixed_dish, not solid_protein).
// Higher-specificity buckets are listed first.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import type { FoodDensity } from './types';

interface DensityBucket {
  category: string;
  densityGPerMl: number;
  matchers: ReadonlyArray<RegExp>;
}

export const DENSITY_BUCKETS: ReadonlyArray<DensityBucket> = [
  {
    category: 'mixed_dish',
    densityGPerMl: 0.95,
    matchers: [
      /curry|stew|casserole|soup|chili|chowder|ramen|pho|risotto|paella|bibimbap|tagine|goulash/i,
    ],
  },
  {
    category: 'sauce_dressing',
    densityGPerMl: 1.05,
    matchers: [
      /sauce|dressing|gravy|ketchup|mayo|mayonnaise|aioli|hummus|tzatziki|raita|chimichurri|salsa/i,
    ],
  },
  {
    category: 'snack_crunchy',
    densityGPerMl: 0.40,
    matchers: [
      /chip|crisp|cracker|granola|cereal|popcorn|pretzel/i,
    ],
  },
  {
    category: 'liquid_oil',
    densityGPerMl: 0.92,
    matchers: [
      /oil$|olive oil|coconut oil|sesame oil|avocado oil|butter|ghee/i,
    ],
  },
  {
    category: 'liquid_dairy',
    densityGPerMl: 1.03,
    matchers: [
      /milk|yogurt|kefir|cream|smoothie/i,
    ],
  },
  {
    category: 'liquid_water',
    densityGPerMl: 1.00,
    matchers: [
      /water|broth|stock|tea|coffee|juice/i,
    ],
  },
  {
    category: 'solid_protein',
    densityGPerMl: 1.05,
    matchers: [
      /chicken|beef|pork|lamb|turkey|salmon|tuna|fish|shrimp|prawn|tofu|tempeh|egg/i,
    ],
  },
  {
    category: 'solid_starch',
    densityGPerMl: 0.85,
    matchers: [
      /rice|pasta|noodle|potato|yam|bread|toast|tortilla|naan|chapati|biryani/i,
    ],
  },
  {
    category: 'vegetable',
    densityGPerMl: 0.60,
    matchers: [
      /broccoli|carrot|spinach|lettuce|kale|salad|cucumber|pepper|onion|tomato|asparagus|cauliflower|cabbage|zucchini|squash|beet|radish/i,
    ],
  },
  {
    category: 'fruit',
    densityGPerMl: 0.65,
    matchers: [
      /apple|banana|orange|berry|berries|grape|pineapple|mango|peach|pear|melon|watermelon|kiwi|plum|strawberry|blueberry|raspberry/i,
    ],
  },
  {
    category: 'unknown',
    densityGPerMl: 0.90,
    matchers: [],
  },
];

const UNKNOWN_BUCKET: DensityBucket = DENSITY_BUCKETS[DENSITY_BUCKETS.length - 1];

export function densityFor(foodName: string): FoodDensity {
  const name = (foodName ?? '').toString();
  for (const bucket of DENSITY_BUCKETS) {
    if (bucket.matchers.length === 0) continue;
    for (const matcher of bucket.matchers) {
      if (matcher.test(name)) {
        return {
          category: bucket.category,
          densityGPerMl: bucket.densityGPerMl,
        };
      }
    }
  }
  return {
    category: UNKNOWN_BUCKET.category,
    densityGPerMl: UNKNOWN_BUCKET.densityGPerMl,
  };
}
