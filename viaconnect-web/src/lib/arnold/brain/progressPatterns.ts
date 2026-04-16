// Arnold Brain — Domain 6: Progress Pattern Recognition

export const PROGRESS_SCENARIOS = {
  scale_stall_visual_change: {
    pattern: 'Weight unchanged for 2 to 4 weeks but photos show visible fat reduction',
    explanation: 'Body recomposition, losing fat while gaining muscle. Scale is stable but composition is improving.',
    recommendation: 'Trust the photos and measurements. Continue current protocol.',
    frequency: 'Very common in first 3 to 6 months of resistance training.',
  },
  scale_down_no_visual_change: {
    pattern: 'Weight decreasing but photos show minimal visible change',
    explanation: 'Likely losing water weight or muscle along with fat. May indicate inadequate protein or excessive deficit.',
    recommendation: 'Verify protein intake at or above 0.7 g per lb bodyweight. Ensure resistance training volume maintained.',
    frequency: 'Common early in deficits, especially without resistance training.',
  },
  scale_up_looks_better: {
    pattern: 'Weight increasing but photos show improved muscle definition',
    explanation: 'Successful muscle gain phase, lean bulk. Muscle is denser than fat so more muscle at same volume weighs more.',
    recommendation: 'Positive trajectory. Monitor rate, if gaining over 1 percent bodyweight per month, may be excessive.',
    frequency: 'Desired in bulk phases; monitor waist measurement to detect fat accumulation.',
  },
  fast_initial_then_plateau: {
    pattern: 'Rapid progress for 4 to 8 weeks then stalls',
    explanation: 'Initial water and glycogen loss created fast results. True fat loss rate has now been revealed. This is normal.',
    recommendation: 'Recalculate TDEE at new weight. May need small deficit adjustment. Patience, 1 lb per week is excellent progress.',
    frequency: 'Universal; every successful cut hits this plateau.',
  },
  uneven_fat_loss: {
    pattern: 'Some areas losing fat visibly while others appear unchanged',
    explanation: 'Fat loss pattern is genetically determined. Stubborn areas (lower abdomen male, hips and thighs female) are last to respond.',
    recommendation: 'Cannot spot reduce. Continue overall caloric deficit. Stubborn areas respond last but will respond.',
    frequency: 'Universal; every cut has a last-stubborn area.',
  },
  cyclical_appearance: {
    pattern: 'Photos look noticeably different week to week despite consistent protocol',
    explanation: 'Water retention fluctuations from sodium, carb intake, menstrual cycle, stress, sleep quality.',
    recommendation: 'Compare photos 4 weeks apart, not week to week. Monthly comparison removes day to day noise.',
    frequency: 'Common, especially in women during luteal phase.',
  },
} as const;

export type ProgressScenario = keyof typeof PROGRESS_SCENARIOS;

export const COMPARISON_INTERVALS = {
  minimum_meaningful: '2 weeks, earliest a trained eye can detect fat loss',
  recommended:        '4 weeks, reliable visual changes visible for most',
  optimal:            '8 to 12 weeks, dramatic visual differences likely if protocol adherent',
  note: 'Arnold warns users against comparing photos taken less than 2 weeks apart.',
} as const;

export const PROGRESS_PATTERNS_SUMMARY = `
COMMON PROGRESS PATTERNS ARNOLD RECOGNIZES:
  1. Scale stalls, photos improve: recomposition in progress, trust the photos
  2. Scale drops, photos unchanged: losing water or muscle, check protein and training
  3. Scale rises, photos improve: lean bulk working, monitor waist
  4. Fast start then plateau: initial water loss unmasked true rate, recalculate TDEE
  5. Uneven fat loss: genetics, stubborn areas go last, cannot spot reduce
  6. Week-to-week swings: water retention noise, compare 4 weeks apart

COMPARISON INTERVALS:
  Under 2 weeks: noise, not signal
  2-4 weeks: minimum meaningful
  4-8 weeks: recommended
  8-12 weeks: dramatic changes expected with adherence
`.trim();
