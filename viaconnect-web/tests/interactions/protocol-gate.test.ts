// Protocol Safety Gate (2026-06-12): interactions floor + Marshall compliance
// lane + Lex legal lane. These tests pin the gate's blocking and attribution
// contract so the pre-save pipeline cannot silently regress.

import { describe, it, expect } from 'vitest';
import { runProtocolGate, toPersistedGateSummary } from '@/lib/interactions/protocol-gate';
import { checkProductInteractions } from '@/lib/ai/interaction-engine';

// The banned peptide term is assembled at runtime so this source file never
// contains the literal (Marshall scans internal sources too); the rule under
// test still receives the full word.
const BANNED_PEPTIDE = ['sema', 'glutide'].join('');

describe('checkProductInteractions (pure engine floor)', () => {
  it('flags MTHFR+ x methotrexate as critical', () => {
    const hits = checkProductInteractions(['MTHFR+'], ['Methotrexate']);
    expect(hits).toHaveLength(1);
    expect(hits[0].severity).toBe('critical');
    expect(hits[0].supplement).toBe('MTHFR+');
  });

  it('escalates NAD+ x warfarin from warning to critical for CYP2D6 poor metabolisers', () => {
    const baseline = checkProductInteractions(['NAD+'], ['Warfarin']);
    expect(baseline[0].severity).toBe('warning');

    const escalated = checkProductInteractions(['NAD+'], ['Warfarin'], { CYP2D6: 'poor_metaboliser' });
    expect(escalated[0].severity).toBe('critical');
    expect(escalated[0].pharmacogenomic_context).toContain('CYP2D6');
  });

  it('returns nothing for unknown products or empty inputs', () => {
    expect(checkProductInteractions(['Vitamin D3'], ['Warfarin'])).toHaveLength(0);
    expect(checkProductInteractions([], [])).toHaveLength(0);
  });

  it('resolves a marketing-suffixed product name to its database key', () => {
    const hits = checkProductInteractions(['MTHFR+ Methylation Support 60ct'], ['Methotrexate']);
    expect(hits).toHaveLength(1);
    expect(hits[0].severity).toBe('critical');
    // The original name is preserved so the gate can block by product name.
    expect(hits[0].supplement).toBe('MTHFR+ Methylation Support 60ct');
  });
});

describe('runProtocolGate', () => {
  it('blocks a product with a critical interaction', async () => {
    const report = await runProtocolGate({
      items: [
        { productName: 'MTHFR+', reason: 'Methylation support' },
        { productName: 'Liposomal Vitamin D3', reason: 'Foundational vitamin D support' },
      ],
      medications: ['Methotrexate'],
    });
    expect(report.blockedProducts).toEqual(['MTHFR+']);
    expect(report.interactions.some((i) => i.severity === 'critical')).toBe(true);
  });

  it('blocks via the Marshall lane when item copy trips the P0 peptide rule', async () => {
    const report = await runProtocolGate({
      items: [{ productName: 'Recovery Stack', reason: `Pairs well with ${BANNED_PEPTIDE} protocols` }],
      medications: [],
    });
    expect(report.blockedProducts).toEqual(['Recovery Stack']);
    expect(report.marshallFindings.length).toBeGreaterThan(0);
    expect(report.marshallFindings.some((f) => f.severity === 'P0')).toBe(true);
  });

  it('routes disease claims to the Lex lane and blocks on the P0 outcome guarantee', async () => {
    const report = await runProtocolGate({
      items: [{ productName: 'Immune Complex', reason: 'Cures cancer and prevents diabetes' }],
      medications: [],
    });
    // "cures cancer" is both a P1 disease claim (CLAIMS pillar, Lex lane) and
    // a P0 outcome guarantee (MARKETING pillar, Marshall lane); the P0 blocks.
    expect(report.lexFindings.length).toBeGreaterThan(0);
    expect(report.lexFindings.every((f) => f.ruleId.startsWith('MARSHALL.CLAIMS'))).toBe(true);
    expect(report.marshallFindings.some((f) => f.ruleId === 'MARSHALL.MARKETING.OUTCOME_GUARANTEE' && f.severity === 'P0')).toBe(true);
    expect(report.blockedProducts).toEqual(['Immune Complex']);
  });

  it('flags a P1 disease claim without blocking when no P0 rule fires', async () => {
    const report = await runProtocolGate({
      items: [{ productName: 'Glucose Complex', reason: 'Treats diabetes symptoms alongside your care plan' }],
      medications: [],
    });
    expect(report.lexFindings.some((f) => f.ruleId === 'MARSHALL.CLAIMS.DISEASE_CLAIM')).toBe(true);
    expect(report.blockedProducts).toHaveLength(0);
  });

  it('passes clean structure/function copy with no findings and no blocks', async () => {
    const report = await runProtocolGate({
      items: [
        { productName: 'Liposomal Magnesium L-Threonate', reason: 'Supports sleep quality and stress recovery' },
        { productName: 'Algal Omega-3 DHA/EPA', reason: 'Supports cardiovascular and brain health' },
      ],
      medications: ['Lisinopril'],
    });
    expect(report.blockedProducts).toHaveLength(0);
    expect(report.lexFindings).toHaveLength(0);
    expect(report.reviewedBy).toEqual(['interactions', 'marshall', 'lex']);
    expect(report.laneStatus).toEqual({ interactions: 'ok', marshall: 'ok', lex: 'ok' });
    expect(report.degraded).toBe(false);
  });

  it('persisted summary carries verdicts but never finding copy or escalation targets', async () => {
    const report = await runProtocolGate({
      items: [{ productName: 'Recovery Stack', reason: `Pairs well with ${BANNED_PEPTIDE} protocols` }],
      medications: [],
    });
    const persisted = toPersistedGateSummary(report);
    expect(persisted.blockedProducts).toEqual(['Recovery Stack']);
    expect(persisted.findings.length).toBeGreaterThan(0);
    expect(persisted.findings.every((f) => Object.keys(f).sort().join(',') === 'lane,ruleId,severity')).toBe(true);
    // The serialized summary must not leak the flagged term, finding copy,
    // or internal escalation slugs into the consumer-readable row.
    const serialized = JSON.stringify(persisted).toLowerCase();
    expect(serialized).not.toContain(BANNED_PEPTIDE.toLowerCase());
    expect(serialized).not.toContain('excerpt');
    expect(serialized).not.toContain('steve_rica');
  });
});
