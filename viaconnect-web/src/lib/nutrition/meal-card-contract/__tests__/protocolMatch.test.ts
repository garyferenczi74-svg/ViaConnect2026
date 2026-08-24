import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  canShowMthfrFolateChip,
  allowedGenePanel,
  matchMealToProtocol,
} from '../protocolMatch';
import { contractFromAnalysis } from '../toContract';
import {
  EDUCATIONAL_PROTOCOL_NOTE,
  LIVE_NUTRIGEN_DX_GENES,
  type ProtocolSynthesisInput,
  type ProtocolVariantInput,
} from '../types';

const emptyProtocol: ProtocolSynthesisInput = {
  prefer: [],
  avoid: [],
  recommended: [],
};

function meal(serving: string) {
  return contractFromAnalysis(
    {
      calories: 400,
      protein_g: 30,
      carbs_g: 20,
      total_fat_g: 18,
      saturated_fat_g: 4,
      sugar_g: 3,
      fiber_g: 6,
      confidence: 0.8,
      ai_notes: '',
      serving_description: serving,
    },
    'photo',
    {
      foodNames: [serving],
      micronutrients: { folate: 120, vitamin_d: 4 },
    },
  );
}

describe('Brief 3 protocol match', () => {
  it('blocks MTHFR folate chip when MTHFR is only on nutrigen_dx', () => {
    const protocol: ProtocolSynthesisInput = {
      prefer: [],
      avoid: [],
      recommended: [
        {
          form: 'L-methylfolate',
          rationale: 'MTHFR',
          ruleRsid: 'rs1801133',
        },
      ],
    };
    const variants: ProtocolVariantInput[] = [
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panelKey: 'nutrigen_dx' },
    ];
    expect(canShowMthfrFolateChip(protocol, variants)).toBe(false);
    const result = matchMealToProtocol(meal('spinach salad'), protocol, variants);
    expect(result.chips.some((c) => c.gene === 'MTHFR')).toBe(false);
    expect(result.rings.some((r) => r.nutrientKey === 'folate')).toBe(false);
  });

  it('shows MTHFR folate chip only when protocol has MTHFR on genex_m', () => {
    const protocol: ProtocolSynthesisInput = {
      prefer: ['leafy greens'],
      avoid: ['folic-acid-fortified grains'],
      recommended: [
        {
          form: 'L-methylfolate',
          rationale: 'MTHFR C677T',
          ruleRsid: 'rs1801133',
        },
      ],
    };
    const variants: ProtocolVariantInput[] = [
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panelKey: 'genex_m' },
    ];
    expect(canShowMthfrFolateChip(protocol, variants)).toBe(true);
    const result = matchMealToProtocol(meal('spinach salad'), protocol, variants);
    expect(result.chips.some((c) => c.id === 'gene:mthfr-folate')).toBe(true);
    expect(result.rings.some((r) => r.nutrientKey === 'folate' && r.panel === 'genex_m')).toBe(true);
  });

  it('does not invent MTHFR on live nutrigen_dx ACTN3/FTO/VDR', () => {
    expect([...LIVE_NUTRIGEN_DX_GENES]).toEqual(['ACTN3', 'FTO', 'VDR']);
    const protocol: ProtocolSynthesisInput = {
      prefer: [],
      avoid: [],
      recommended: [
        { form: 'cholecalciferol', rationale: 'VDR', ruleRsid: 'rs1544410' },
        { form: 'protein-forward meals', rationale: 'FTO', ruleRsid: 'rs9939609' },
        { form: 'protein timing', rationale: 'ACTN3', ruleRsid: 'rs1815739' },
      ],
    };
    const variants: ProtocolVariantInput[] = [
      { rsid: 'rs1544410', gene: 'VDR', genotype: 'TT', panelKey: 'nutrition' },
      { rsid: 'rs9939609', gene: 'FTO', genotype: 'AA', panelKey: 'nutrigen_dx' },
      { rsid: 'rs1815739', gene: 'ACTN3', genotype: 'TT', panelKey: 'nutrigen-dx' },
    ];
    const result = matchMealToProtocol(meal('salmon and eggs'), protocol, variants);
    expect(result.chips.some((c) => c.gene === 'MTHFR')).toBe(false);
    expect(result.chips.some((c) => c.gene === 'VDR')).toBe(true);
    expect(result.chips.some((c) => c.gene === 'FTO')).toBe(true);
    expect(result.chips.some((c) => c.gene === 'ACTN3')).toBe(true);
    expect(result.rings.every((r) => r.gene !== 'MTHFR')).toBe(true);
  });

  it('does not invent gene scores and stays educational', () => {
    const result = matchMealToProtocol(meal('rice'), emptyProtocol, []);
    expect(result.educationalNote).toBe(EDUCATIONAL_PROTOCOL_NOTE);
    expect(result.chips).toEqual([]);
    expect(result.rings).toEqual([]);
    expect(result.educationalNote.toLowerCase()).toContain('not a diagnosis');
    expect(result.educationalNote.toLowerCase()).toContain('not a gene score');
  });

  it('rejects ACTN3 and FTO on genex_m and MTHFR on nutrigen_dx', () => {
    expect(allowedGenePanel('MTHFR', 'nutrigen_dx')).toBeNull();
    expect(allowedGenePanel('MTHFR', 'genex_m')).toBe('genex_m');
    expect(allowedGenePanel('ACTN3', 'genex_m')).toBeNull();
    expect(allowedGenePanel('FTO', 'genex_m')).toBeNull();
    expect(allowedGenePanel('ACTN3', 'nutrigen_dx')).toBe('nutrigen_dx');
    expect(allowedGenePanel('VDR', 'nutrigen_dx')).toBe('nutrigen_dx');
    expect(allowedGenePanel('APOE', 'genex_m')).toBeNull();
  });

  it('marks rings unmeasured instead of inventing amounts', () => {
    const protocol: ProtocolSynthesisInput = {
      prefer: [],
      avoid: [],
      recommended: [
        { form: 'L-methylfolate', rationale: 'MTHFR', ruleRsid: 'rs1801133' },
      ],
    };
    const variants: ProtocolVariantInput[] = [
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'CT', panelKey: 'methylation' },
    ];
    const noMicros = contractFromAnalysis(
      meal('spinach').analysis,
      'text',
      { foodNames: ['spinach'], micronutrients: {} },
    );
    const result = matchMealToProtocol(noMicros, protocol, variants);
    const folate = result.rings.find((r) => r.nutrientKey === 'folate');
    expect(folate?.unmeasured).toBe(true);
    expect(folate?.amount).toBeNull();
    expect(folate?.fillPct).toBe(0);
  });
});

describe('Brief 3 guardrails in new sources', () => {
  const files = [
    'protocolMatch.ts',
    'toContract.ts',
    'types.ts',
  ].map((name) =>
    readFileSync(path.join(__dirname, '..', name), 'utf8'),
  );

  it('does not mention 10-27x, Semaglutide, or invented assays', () => {
    const blob = files.join('\n');
    expect(blob).not.toMatch(/10\s*[–-]\s*27x/i);
    expect(blob).not.toMatch(/5\s*[–-]\s*27x/i);
    expect(blob.toLowerCase()).not.toContain('semaglutide');
    expect(blob.toLowerCase()).not.toContain('retatrutide');
    expect(blob).not.toMatch(/:\s*any\b/);
    expect(blob).not.toMatch(/\bas any\b/);
  });
});
