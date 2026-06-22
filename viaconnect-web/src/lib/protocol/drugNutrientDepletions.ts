/**
 * Drug-nutrient depletion engine.
 * Pure/deterministic; never throws.
 * Evidence-tiered clinical content (established pharmacology).
 */

export interface Depletion {
  medicationClass: string
  matches: string[]
  depletedNutrient: string
  mechanism: string
  evidenceTier: 1 | 2 | 3
}

export const DEPLETIONS: Depletion[] = [
  {
    medicationClass: 'biguanides',
    matches: ['metformin', 'glucophage'],
    depletedNutrient: 'vitamin B12',
    mechanism: 'reduces ileal calcium-dependent B12 absorption',
    evidenceTier: 1,
  },
  {
    medicationClass: 'statins',
    matches: [
      'statin',
      'atorvastatin',
      'simvastatin',
      'rosuvastatin',
      'pravastatin',
      'lovastatin',
    ],
    depletedNutrient: 'CoQ10',
    mechanism:
      'inhibits the mevalonate pathway shared with endogenous CoQ10 synthesis',
    evidenceTier: 2,
  },
  {
    medicationClass: 'proton pump inhibitors',
    matches: [
      'omeprazole',
      'esomeprazole',
      'pantoprazole',
      'lansoprazole',
      'rabeprazole',
      'prazole',
    ],
    depletedNutrient: 'magnesium',
    mechanism: 'long-term PPI use reduces magnesium absorption',
    evidenceTier: 2,
  },
  {
    medicationClass: 'proton pump inhibitors',
    matches: [
      'omeprazole',
      'esomeprazole',
      'pantoprazole',
      'lansoprazole',
      'rabeprazole',
      'prazole',
    ],
    depletedNutrient: 'vitamin B12',
    mechanism: 'reduced gastric acid lowers B12 cleavage and absorption',
    evidenceTier: 2,
  },
  {
    medicationClass: 'loop diuretics',
    matches: ['furosemide', 'bumetanide', 'torsemide'],
    depletedNutrient: 'magnesium',
    mechanism: 'increased renal magnesium excretion',
    evidenceTier: 2,
  },
  {
    medicationClass: 'loop diuretics',
    matches: ['furosemide', 'bumetanide', 'torsemide'],
    depletedNutrient: 'potassium',
    mechanism: 'increased renal potassium excretion',
    evidenceTier: 2,
  },
]

export interface RepletionConsideration {
  medication: string
  depletedNutrient: string
  mechanism: string
  evidenceTier: 1 | 2 | 3
}

/**
 * For each medication name (lowercased, trimmed), find every DEPLETIONS entry
 * whose any `matches` substring is contained in the name. Emit one
 * RepletionConsideration per (medication, depletion) hit. Deduplicates
 * identical (medication + depletedNutrient) pairs.
 */
export function depletionsForMedications(
  medications: string[]
): RepletionConsideration[] {
  const seen = new Set<string>()
  const results: RepletionConsideration[] = []

  for (const raw of medications) {
    const name = raw.toLowerCase().trim()
    if (!name) continue

    for (const depletion of DEPLETIONS) {
      const matched = depletion.matches.some((m) => name.includes(m))
      if (!matched) continue

      const key = `${name}|${depletion.depletedNutrient}`
      if (seen.has(key)) continue
      seen.add(key)

      results.push({
        medication: name,
        depletedNutrient: depletion.depletedNutrient,
        mechanism: depletion.mechanism,
        evidenceTier: depletion.evidenceTier,
      })
    }
  }

  return results
}
