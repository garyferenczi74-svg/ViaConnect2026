import { describe, it, expect } from 'vitest'
import { DEPLETIONS, depletionsForMedications } from '../drugNutrientDepletions'

describe('DEPLETIONS constant', () => {
  it('includes metformin -> vitamin B12 at tier 1', () => {
    const entry = DEPLETIONS.find(
      (d) => d.matches.includes('metformin') && d.depletedNutrient === 'vitamin B12'
    )
    expect(entry).toBeDefined()
    expect(entry!.evidenceTier).toBe(1)
  })

  it('includes at least one PPI -> magnesium entry', () => {
    const entry = DEPLETIONS.find(
      (d) =>
        d.matches.some((m) => m.includes('prazole')) && d.depletedNutrient === 'magnesium'
    )
    expect(entry).toBeDefined()
  })

  it('every entry has a non-empty mechanism and tier in 1..3', () => {
    for (const d of DEPLETIONS) {
      expect(d.mechanism.length).toBeGreaterThan(0)
      expect([1, 2, 3]).toContain(d.evidenceTier)
    }
  })
})

describe('depletionsForMedications', () => {
  it('returns vitamin B12 for Metformin 500mg (case-insensitive, substring)', () => {
    const result = depletionsForMedications(['Metformin 500mg'])
    const b12 = result.find((r) => r.depletedNutrient === 'vitamin B12')
    expect(b12).toBeDefined()
    expect(b12!.medication).toBe('metformin 500mg')
  })

  it('returns CoQ10 for atorvastatin', () => {
    const result = depletionsForMedications(['atorvastatin'])
    const coq10 = result.find((r) => r.depletedNutrient === 'CoQ10')
    expect(coq10).toBeDefined()
  })

  it('returns both magnesium AND vitamin B12 for omeprazole', () => {
    const result = depletionsForMedications(['omeprazole'])
    const nutrients = result.map((r) => r.depletedNutrient)
    expect(nutrients).toContain('magnesium')
    expect(nutrients).toContain('vitamin B12')
  })

  it('returns [] for lisinopril (no known depletion)', () => {
    const result = depletionsForMedications(['lisinopril'])
    expect(result).toEqual([])
  })

  it('deduplicates identical medication+depletedNutrient pairs', () => {
    // If a medication name matches multiple substrings for the same depletion
    // (e.g. 'omeprazole prazole' would match 'omeprazole' AND 'prazole'),
    // each unique (medication, depletedNutrient) should appear only once.
    const result = depletionsForMedications(['omeprazole'])
    const magnesiumHits = result.filter((r) => r.depletedNutrient === 'magnesium')
    expect(magnesiumHits.length).toBe(1)
    const b12Hits = result.filter((r) => r.depletedNutrient === 'vitamin B12')
    expect(b12Hits.length).toBe(1)
  })

  it('handles empty input without throwing', () => {
    expect(() => depletionsForMedications([])).not.toThrow()
    expect(depletionsForMedications([])).toEqual([])
  })

  it('handles malformed input without throwing', () => {
    // Empty strings and whitespace-only strings should not throw
    expect(() => depletionsForMedications(['', '   '])).not.toThrow()
  })
})
