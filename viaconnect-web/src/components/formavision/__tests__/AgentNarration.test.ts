// Prompt 210b P6-T2: TDD tests for AgentNarration (written before implementation,
// per TDD discipline).
//
// Tests the pure narration lib (buildNarrationLines) only. The component itself
// is read-only and covered by the lib tests below; no DOM/renderToStaticMarkup
// needed here because the logic under test is a pure function.
//
// Coverage:
//   1. improved delta -> encouraging "what changed" line
//   2. worsened delta -> non-shaming constructive line
//   3. unchanged/neutral delta -> steady/encouraging line
//   4. biggestChange.kind = 'bodyFat' -> notable line mentions "body fat"
//   5. biggestChange.kind = 'circumference' -> notable line mentions the label
//   6. biggestChange.kind = 'muscle' -> notable line mentions the label
//   7. null deltas -> honest first-scan welcome; no fabricated change; no "0"
//   8. empty deltas (all null) -> honest first-scan welcome
//   9. attribution: all speakers are display names (Arnold / Hannah), never slugs
//  10. no medical/dosage/dietary term in any generated line (banned-term list)
//  11. deterministic: same deltas -> same lines

import { describe, it, expect } from 'vitest';
import { buildNarrationLines } from '@/lib/formavision/narration/agentNarration';
import type { CompositionDeltasResult } from '@/lib/formavision/deltas/compositionDeltas';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const IMPROVED_BODY_FAT: CompositionDeltasResult = {
  bodyFat: { from: 25.0, to: 22.0, delta: -3.0, direction: 'improved' },
  circumferences: [],
  muscle: [],
  biggest: {
    kind: 'bodyFat',
    magnitude: 3.0,
    detail: { from: 25.0, to: 22.0, delta: -3.0, direction: 'improved' },
  },
};

const WORSENED_BODY_FAT: CompositionDeltasResult = {
  bodyFat: { from: 22.0, to: 25.0, delta: 3.0, direction: 'worsened' },
  circumferences: [],
  muscle: [],
  biggest: {
    kind: 'bodyFat',
    magnitude: 3.0,
    detail: { from: 22.0, to: 25.0, delta: 3.0, direction: 'worsened' },
  },
};

const UNCHANGED_BODY_FAT: CompositionDeltasResult = {
  bodyFat: { from: 22.0, to: 22.1, delta: 0.1, direction: 'unchanged' },
  circumferences: [],
  muscle: [],
  biggest: {
    kind: 'bodyFat',
    magnitude: 0.1,
    detail: { from: 22.0, to: 22.1, delta: 0.1, direction: 'unchanged' },
  },
};

const NEUTRAL_CIRCUMFERENCE: CompositionDeltasResult = {
  bodyFat: null,
  circumferences: [
    {
      key: 'shoulderWidth',
      label: 'Shoulder Width',
      from: 18.0,
      to: 17.5,
      delta: -0.5,
      direction: 'neutral',
      unit: 'in',
    },
  ],
  muscle: [],
  biggest: {
    kind: 'circumference',
    magnitude: 0.5,
    detail: {
      key: 'shoulderWidth',
      label: 'Shoulder Width',
      from: 18.0,
      to: 17.5,
      delta: -0.5,
      direction: 'neutral',
      unit: 'in',
    },
  },
};

const WAIST_IMPROVED: CompositionDeltasResult = {
  bodyFat: null,
  circumferences: [
    {
      key: 'waist',
      label: 'Waist Circumference',
      from: 35.0,
      to: 32.0,
      delta: -3.0,
      direction: 'improved',
      unit: 'in',
    },
  ],
  muscle: [],
  biggest: {
    kind: 'circumference',
    magnitude: 3.0,
    detail: {
      key: 'waist',
      label: 'Waist Circumference',
      from: 35.0,
      to: 32.0,
      delta: -3.0,
      direction: 'improved',
      unit: 'in',
    },
  },
};

const WAIST_WORSENED: CompositionDeltasResult = {
  bodyFat: null,
  circumferences: [
    {
      key: 'waist',
      label: 'Waist Circumference',
      from: 32.0,
      to: 35.0,
      delta: 3.0,
      direction: 'worsened',
      unit: 'in',
    },
  ],
  muscle: [],
  biggest: {
    kind: 'circumference',
    magnitude: 3.0,
    detail: {
      key: 'waist',
      label: 'Waist Circumference',
      from: 32.0,
      to: 35.0,
      delta: 3.0,
      direction: 'worsened',
      unit: 'in',
    },
  },
};

const MUSCLE_IMPROVED: CompositionDeltasResult = {
  bodyFat: null,
  circumferences: [],
  muscle: [
    {
      key: 'totalMuscleMassLbs',
      label: 'Total Muscle Mass',
      from: 140.0,
      to: 145.0,
      delta: 5.0,
      direction: 'improved',
    },
  ],
  biggest: {
    kind: 'muscle',
    magnitude: 5.0,
    detail: {
      key: 'totalMuscleMassLbs',
      label: 'Total Muscle Mass',
      from: 140.0,
      to: 145.0,
      delta: 5.0,
      direction: 'improved',
    },
  },
};

const MUSCLE_WORSENED: CompositionDeltasResult = {
  bodyFat: null,
  circumferences: [],
  muscle: [
    {
      key: 'totalMuscleMassLbs',
      label: 'Total Muscle Mass',
      from: 145.0,
      to: 140.0,
      delta: -5.0,
      direction: 'worsened',
    },
  ],
  biggest: {
    kind: 'muscle',
    magnitude: 5.0,
    detail: {
      key: 'totalMuscleMassLbs',
      label: 'Total Muscle Mass',
      from: 145.0,
      to: 140.0,
      delta: -5.0,
      direction: 'worsened',
    },
  },
};

const EMPTY_DELTAS: CompositionDeltasResult = {
  bodyFat: null,
  circumferences: [],
  muscle: [],
  biggest: null,
};

// All allowed speaker names (display names only, never raw slugs).
const ALLOWED_SPEAKERS = new Set(['Arnold', 'Hannah']);

// Terms that must never appear in any narration line (medical/dosage/dietary).
// Constructed as lowercase strings for case-insensitive matching.
const BANNED_TERMS = [
  'dosage',
  'dose',
  'milligram',
  'microgram',
  'medication',
  'drug',
  'diagnose',
  'diagnosis',
  'treatment',
  'treat',
  'cure',
  'prescription',
  'clinical advice',
  'medical advice',
  'physician',
  'calorie',
  'caloric',
  'diet plan',
  'meal plan',
  'fasting',
  'restrict',
];

// ---------------------------------------------------------------------------
// 1. improved delta -> encouraging line
// ---------------------------------------------------------------------------

describe('buildNarrationLines: improved delta', () => {
  it('returns at least one line when body fat improved', () => {
    const lines = buildNarrationLines(IMPROVED_BODY_FAT);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('Arnold line is body-positive / encouraging in tone', () => {
    const lines = buildNarrationLines(IMPROVED_BODY_FAT);
    const arnoldLine = lines.find((l) => l.speaker === 'Arnold');
    expect(arnoldLine).toBeDefined();
    // The line should contain a positive direction word, not a negative framing
    const text = (arnoldLine?.text ?? '').toLowerCase();
    const positiveWords = ['positive', 'right direction', 'moving', 'progress', 'great', 'good', 'well done', 'fantastic', 'forward'];
    const hasPositive = positiveWords.some((w) => text.includes(w));
    expect(hasPositive).toBe(true);
  });

  it('no shame or negative-framing words in improved scenario', () => {
    const lines = buildNarrationLines(IMPROVED_BODY_FAT);
    const allText = lines.map((l) => l.text.toLowerCase()).join(' ');
    const shameWords = ['bad', 'failure', 'failed', 'wrong', 'terrible'];
    for (const word of shameWords) {
      expect(allText).not.toContain(word);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. worsened delta -> non-shaming constructive line
// ---------------------------------------------------------------------------

describe('buildNarrationLines: worsened delta', () => {
  it('returns at least one line when body fat worsened', () => {
    const lines = buildNarrationLines(WORSENED_BODY_FAT);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('worsened line is constructive, not shaming', () => {
    const lines = buildNarrationLines(WORSENED_BODY_FAT);
    const allText = lines.map((l) => l.text.toLowerCase()).join(' ');
    // Must not contain shaming language
    const shameWords = ['bad', 'failure', 'failed', 'wrong', 'terrible', 'shame'];
    for (const word of shameWords) {
      expect(allText).not.toContain(word);
    }
  });

  it('worsened line contains a constructive or data-framing phrase', () => {
    const lines = buildNarrationLines(WORSENED_BODY_FAT);
    const allText = lines.map((l) => l.text.toLowerCase()).join(' ');
    const constructiveWords = [
      'useful', 'data', 'story', 'informed', 'aware', 'tracking',
      'signal', 'normal', 'part of', 'every', 'scan', 'okay', 'ok',
    ];
    const hasConstructive = constructiveWords.some((w) => allText.includes(w));
    expect(hasConstructive).toBe(true);
  });

  it('Arnold line exists for worsened scenario', () => {
    const lines = buildNarrationLines(WORSENED_BODY_FAT);
    const arnoldLine = lines.find((l) => l.speaker === 'Arnold');
    expect(arnoldLine).toBeDefined();
  });

  it('worsened circumference: Arnold primary line is constructive and non-shaming', () => {
    // bodyFat null + worsened circumference -> Arnold falls through to the
    // circumference "what changed" branch. This exercises the worsened
    // circumference primary line that no other fixture covered.
    const lines = buildNarrationLines(WAIST_WORSENED);
    const arnoldLine = lines.find((l) => l.speaker === 'Arnold');
    expect(arnoldLine).toBeDefined();
    const text = (arnoldLine?.text ?? '').toLowerCase();
    // Names the measurements family (not body fat / muscle).
    expect(text).toContain('measurements');
    // Non-shaming.
    const shameWords = ['bad', 'failure', 'failed', 'wrong', 'terrible', 'shame'];
    for (const word of shameWords) {
      expect(text).not.toContain(word);
    }
    // Data-framing / constructive phrasing.
    const constructiveWords = [
      'useful', 'data', 'story', 'informed', 'aware', 'tracking',
      'signal', 'normal', 'part of', 'every', 'scan', 'okay', 'ok',
    ];
    const hasConstructive = constructiveWords.some((w) => text.includes(w));
    expect(hasConstructive).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. unchanged/neutral delta -> steady/encouraging line
// ---------------------------------------------------------------------------

describe('buildNarrationLines: unchanged / neutral delta', () => {
  it('returns at least one line for unchanged body fat', () => {
    const lines = buildNarrationLines(UNCHANGED_BODY_FAT);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('unchanged line mentions stability or consistency', () => {
    const lines = buildNarrationLines(UNCHANGED_BODY_FAT);
    const arnoldLine = lines.find((l) => l.speaker === 'Arnold');
    const text = (arnoldLine?.text ?? '').toLowerCase();
    const steadyWords = ['steady', 'consistent', 'stable', 'held', 'stayed', 'unchanged', 'same'];
    const hasSteady = steadyWords.some((w) => text.includes(w));
    expect(hasSteady).toBe(true);
  });

  it('returns at least one line for neutral circumference (shoulderWidth)', () => {
    const lines = buildNarrationLines(NEUTRAL_CIRCUMFERENCE);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('neutral circumference line is non-shaming', () => {
    const lines = buildNarrationLines(NEUTRAL_CIRCUMFERENCE);
    const allText = lines.map((l) => l.text.toLowerCase()).join(' ');
    const shameWords = ['bad', 'failure', 'wrong', 'terrible'];
    for (const word of shameWords) {
      expect(allText).not.toContain(word);
    }
  });
});

// ---------------------------------------------------------------------------
// 4-6. biggestChange -> notable line names the right metric (drift-proof)
// ---------------------------------------------------------------------------

describe('buildNarrationLines: biggestChange.kind = bodyFat', () => {
  it('notable line mentions "body fat" when biggest is bodyFat', () => {
    const lines = buildNarrationLines(IMPROVED_BODY_FAT);
    const hannahLine = lines.find((l) => l.speaker === 'Hannah');
    expect(hannahLine).toBeDefined();
    // At least one Hannah line must mention the metric "body fat"
    const hannahLines = lines.filter((l) => l.speaker === 'Hannah');
    const anyMentionsFat = hannahLines.some((l) => l.text.toLowerCase().includes('body fat'));
    expect(anyMentionsFat).toBe(true);
  });
});

describe('buildNarrationLines: biggestChange.kind = circumference', () => {
  it('notable line mentions the circumference label when biggest is circumference', () => {
    const lines = buildNarrationLines(WAIST_IMPROVED);
    const hannahLines = lines.filter((l) => l.speaker === 'Hannah');
    // The notable line must contain the label from the delta detail (Waist Circumference)
    const anyMentionsLabel = hannahLines.some((l) =>
      l.text.toLowerCase().includes('waist circumference') ||
      l.text.toLowerCase().includes('waist'),
    );
    expect(anyMentionsLabel).toBe(true);
  });

  it('notable line is drift-proof: labels the exact metric returned by the delta, not a hardcoded metric name', () => {
    // Two different circumference improvements -> two different labels in the notable line
    const linesWaist = buildNarrationLines(WAIST_IMPROVED);
    const linesNeutral = buildNarrationLines(NEUTRAL_CIRCUMFERENCE);

    const waistHannah = linesWaist.filter((l) => l.speaker === 'Hannah').map((l) => l.text).join(' ');
    const neutralHannah = linesNeutral.filter((l) => l.speaker === 'Hannah').map((l) => l.text).join(' ');

    // Waist notable line mentions 'waist' (Waist Circumference)
    expect(waistHannah.toLowerCase()).toContain('waist');
    // Shoulder notable line mentions 'shoulder'
    expect(neutralHannah.toLowerCase()).toContain('shoulder');
  });
});

describe('buildNarrationLines: biggestChange.kind = muscle', () => {
  it('notable line mentions the muscle label when biggest is muscle (improved)', () => {
    const lines = buildNarrationLines(MUSCLE_IMPROVED);
    const hannahLines = lines.filter((l) => l.speaker === 'Hannah');
    const anyMentionsLabel = hannahLines.some((l) =>
      l.text.toLowerCase().includes('total muscle mass') ||
      l.text.toLowerCase().includes('muscle mass') ||
      l.text.toLowerCase().includes('muscle'),
    );
    expect(anyMentionsLabel).toBe(true);
  });

  it('notable line mentions the muscle label when biggest is muscle (worsened)', () => {
    const lines = buildNarrationLines(MUSCLE_WORSENED);
    const hannahLines = lines.filter((l) => l.speaker === 'Hannah');
    const anyMentionsLabel = hannahLines.some((l) =>
      l.text.toLowerCase().includes('total muscle mass') ||
      l.text.toLowerCase().includes('muscle mass') ||
      l.text.toLowerCase().includes('muscle'),
    );
    expect(anyMentionsLabel).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7-8. no/empty deltas -> honest first-scan welcome
// ---------------------------------------------------------------------------

describe('buildNarrationLines: null deltas (no prior scan)', () => {
  it('returns at least one line for null input', () => {
    const lines = buildNarrationLines(null);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('first-scan lines do not contain the string "0"', () => {
    const lines = buildNarrationLines(null);
    const allText = lines.map((l) => l.text).join(' ');
    // No fabricated delta values: "0" as a standalone change should not appear
    expect(allText).not.toMatch(/\b0\b/);
  });

  it('first-scan lines do not fabricate change direction words', () => {
    const lines = buildNarrationLines(null);
    const allText = lines.map((l) => l.text.toLowerCase()).join(' ');
    // Should not claim any real metric moved
    const fabricatedWords = ['improved', 'worsened', 'decreased', 'increased'];
    for (const word of fabricatedWords) {
      expect(allText).not.toContain(word);
    }
  });

  it('first-scan welcome contains an honest starting-point phrase', () => {
    const lines = buildNarrationLines(null);
    const allText = lines.map((l) => l.text.toLowerCase()).join(' ');
    const startPhrases = [
      'starting point',
      'first scan',
      'begin',
      'journey',
      'here',
      'start',
      'welcome',
    ];
    const hasStart = startPhrases.some((p) => allText.includes(p));
    expect(hasStart).toBe(true);
  });
});

describe('buildNarrationLines: empty deltas (single scan, nothing to compare)', () => {
  it('returns at least one line for empty deltas', () => {
    const lines = buildNarrationLines(EMPTY_DELTAS);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('empty-delta lines do not contain "0"', () => {
    const lines = buildNarrationLines(EMPTY_DELTAS);
    const allText = lines.map((l) => l.text).join(' ');
    expect(allText).not.toMatch(/\b0\b/);
  });

  it('empty-delta lines do not fabricate change', () => {
    const lines = buildNarrationLines(EMPTY_DELTAS);
    const allText = lines.map((l) => l.text.toLowerCase()).join(' ');
    const fabricatedWords = ['improved', 'worsened', 'decreased', 'increased'];
    for (const word of fabricatedWords) {
      expect(allText).not.toContain(word);
    }
  });
});

// ---------------------------------------------------------------------------
// 9. Attribution: display names only, never raw slugs
// ---------------------------------------------------------------------------

describe('buildNarrationLines: attribution via getDisplayName', () => {
  const ALL_FIXTURES: Array<[string, CompositionDeltasResult | null]> = [
    ['null (first scan)', null],
    ['empty deltas', EMPTY_DELTAS],
    ['improved body fat', IMPROVED_BODY_FAT],
    ['worsened body fat', WORSENED_BODY_FAT],
    ['unchanged body fat', UNCHANGED_BODY_FAT],
    ['waist improved (circumference)', WAIST_IMPROVED],
    ['muscle improved', MUSCLE_IMPROVED],
    ['muscle worsened', MUSCLE_WORSENED],
    ['neutral circumference', NEUTRAL_CIRCUMFERENCE],
  ];

  for (const [label, fixture] of ALL_FIXTURES) {
    it(`all speakers are display names (not slugs) for: ${label}`, () => {
      const lines = buildNarrationLines(fixture);
      for (const line of lines) {
        expect(ALLOWED_SPEAKERS.has(line.speaker)).toBe(true);
      }
    });

    it(`no raw slug "arnold" appears as speaker for: ${label}`, () => {
      const lines = buildNarrationLines(fixture);
      for (const line of lines) {
        expect(line.speaker).not.toBe('arnold');
      }
    });

    it(`no raw slug "hannah" appears as speaker for: ${label}`, () => {
      const lines = buildNarrationLines(fixture);
      for (const line of lines) {
        expect(line.speaker).not.toBe('hannah');
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 10. No medical/dosage/dietary term in any generated line
// ---------------------------------------------------------------------------

describe('buildNarrationLines: banned-term guard (no medical/dosage/dietary)', () => {
  const ALL_FIXTURES: Array<[string, CompositionDeltasResult | null]> = [
    ['null (first scan)', null],
    ['empty deltas', EMPTY_DELTAS],
    ['improved body fat', IMPROVED_BODY_FAT],
    ['worsened body fat', WORSENED_BODY_FAT],
    ['unchanged body fat', UNCHANGED_BODY_FAT],
    ['waist improved (circumference)', WAIST_IMPROVED],
    ['muscle improved', MUSCLE_IMPROVED],
    ['muscle worsened', MUSCLE_WORSENED],
    ['neutral circumference', NEUTRAL_CIRCUMFERENCE],
  ];

  for (const [label, fixture] of ALL_FIXTURES) {
    for (const term of BANNED_TERMS) {
      it(`no banned term "${term}" in lines for: ${label}`, () => {
        const lines = buildNarrationLines(fixture);
        const allText = lines.map((l) => l.text.toLowerCase()).join(' ');
        expect(allText).not.toContain(term);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// 11. Deterministic: same deltas -> same lines
// ---------------------------------------------------------------------------

describe('buildNarrationLines: deterministic output', () => {
  const FIXTURES: Array<[string, CompositionDeltasResult | null]> = [
    ['null', null],
    ['empty', EMPTY_DELTAS],
    ['improved body fat', IMPROVED_BODY_FAT],
    ['worsened body fat', WORSENED_BODY_FAT],
    ['waist improved', WAIST_IMPROVED],
    ['muscle improved', MUSCLE_IMPROVED],
  ];

  for (const [label, fixture] of FIXTURES) {
    it(`same output on repeated calls with same input: ${label}`, () => {
      const first = buildNarrationLines(fixture);
      const second = buildNarrationLines(fixture);
      expect(first).toEqual(second);
    });
  }
});

// ---------------------------------------------------------------------------
// 12. No em/en dashes in any output (standing rule)
// ---------------------------------------------------------------------------

describe('buildNarrationLines: no em/en dashes (standing rule)', () => {
  const EN_DASH = String.fromCharCode(0x2013);
  const EM_DASH = String.fromCharCode(0x2014);

  const ALL_FIXTURES: Array<[string, CompositionDeltasResult | null]> = [
    ['null (first scan)', null],
    ['empty deltas', EMPTY_DELTAS],
    ['improved body fat', IMPROVED_BODY_FAT],
    ['worsened body fat', WORSENED_BODY_FAT],
    ['waist improved', WAIST_IMPROVED],
    ['muscle improved', MUSCLE_IMPROVED],
  ];

  for (const [label, fixture] of ALL_FIXTURES) {
    it(`no em/en dashes in output for: ${label}`, () => {
      const lines = buildNarrationLines(fixture);
      const allText = lines.map((l) => l.speaker + l.text).join('');
      expect(allText).not.toContain(EN_DASH);
      expect(allText).not.toContain(EM_DASH);
    });
  }
});
