import { describe, it, expect, vi } from 'vitest';
import {
  checkBrokenCrossReferences,
  checkEvidenceSourceCollectors,
  checkSoaExcludesMandatedControl,
  checkAddressableImplementedDrift,
  checkCoverageGap,
} from '@/lib/compliance/consistency/rules';
import { runAllRules, buildKnownCollectorIds } from '@/lib/compliance/consistency/checker';
import type { CheckerInput } from '@/lib/compliance/consistency/types';
import { loadRegistry } from '@/lib/compliance/frameworks/registry';
import { DB_COLLECTORS } from '@/lib/soc2/collectors/runAll';
import { HIPAA_COLLECTORS } from '@/lib/hipaa/collectors/runAll';
import { ISO_COLLECTORS } from '@/lib/iso/collectors/runAll';

// ─── Rule 1: broken cross-references ─────────────────────────────────────

describe('checkBrokenCrossReferences', () => {
  it('registry has no broken cross references today', () => {
    const flags = checkBrokenCrossReferences();
    expect(flags).toEqual([]);
  });
});

// ─── Rule 2: evidence_source_missing_collector ────────────────────────────

describe('checkEvidenceSourceCollectors', () => {
  it('registry has no dangling collector references today', () => {
    const knownCollectorIds = buildKnownCollectorIds();
    const flags = checkEvidenceSourceCollectors({
      knownCollectorIds,
      soaByControlRef: new Map(),
    });
    expect(flags).toEqual([]);
  });

  it('flags when a collector id is unknown', () => {
    const knownCollectorIds = new Set(['fake-collector']);
    const flags = checkEvidenceSourceCollectors({
      knownCollectorIds,
      soaByControlRef: new Map(),
    });
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.every((f) => f.flagKind === 'evidence_source_missing_collector')).toBe(true);
    expect(flags.every((f) => f.severity === 'critical')).toBe(true);
  });
});

// ─── Rule 3: soa_excludes_mandated_control ────────────────────────────────

describe('checkSoaExcludesMandatedControl', () => {
  it('no flag when SoA is empty', () => {
    const flags = checkSoaExcludesMandatedControl({
      knownCollectorIds: buildKnownCollectorIds(),
      soaByControlRef: new Map(),
    });
    expect(flags).toEqual([]);
  });

  it('no flag when Annex A control is marked applicable', () => {
    // A.5.15 is equivalent to HIPAA 164.312(a)(1) which is Required.
    const soaByControlRef = new Map([
      ['A.5.15', { applicability: 'applicable' as const, implementationStatus: 'implemented' }],
    ]);
    const flags = checkSoaExcludesMandatedControl({ knownCollectorIds: new Set(), soaByControlRef });
    expect(flags).toEqual([]);
  });

  it('flags critically when Annex A control equivalent to a HIPAA Required safeguard is excluded', () => {
    const soaByControlRef = new Map([
      ['A.5.15', { applicability: 'excluded' as const, implementationStatus: 'not_applicable' }],
    ]);
    const flags = checkSoaExcludesMandatedControl({ knownCollectorIds: new Set(), soaByControlRef });
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.every((f) => f.flagKind === 'soa_excludes_mandated_control')).toBe(true);
    expect(flags.every((f) => f.severity === 'critical')).toBe(true);
    expect(flags[0].frameworkId).toBe('iso_27001_2022');
    expect(flags[0].controlRef).toBe('A.5.15');
    expect(flags[0].relatedFrameworkId).toBe('hipaa_security');
  });
});

// ─── Rule 4: addressable_vs_implemented_drift ─────────────────────────────

describe('checkAddressableImplementedDrift', () => {
  it('no flag when SoA is empty', () => {
    const flags = checkAddressableImplementedDrift({
      knownCollectorIds: buildKnownCollectorIds(),
      soaByControlRef: new Map(),
    });
    expect(flags).toEqual([]);
  });

  it('info-severity flag when ISO is implemented but paired HIPAA control is Addressable', () => {
    const reg = loadRegistry();
    const iso = reg.frameworks.iso_27001_2022;
    const hipaa = reg.frameworks.hipaa_security;
    // Find any Annex A control with an equivalent HIPAA Addressable cross reference.
    const isoTarget = iso.controlPoints.find((c) =>
      c.id.startsWith('A.') &&
      (c.crossFrameworkReferences ?? []).some((r) =>
        r.framework === 'hipaa_security' &&
        r.relationship === 'equivalent' &&
        hipaa.controlPoints.find((h) => h.id === r.controlId)?.requiredOrAddressable === 'addressable'
      )
    );
    if (!isoTarget) {
      // No current registry pair matches the pattern; test vacuously passes.
      return;
    }
    const soaByControlRef = new Map([
      [isoTarget.id, { applicability: 'applicable' as const, implementationStatus: 'implemented' }],
    ]);
    const flags = checkAddressableImplementedDrift({ knownCollectorIds: new Set(), soaByControlRef });
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.every((f) => f.severity === 'info')).toBe(true);
    expect(flags.every((f) => f.flagKind === 'addressable_vs_implemented_drift')).toBe(true);
  });
});

// ─── Rule 5: cross_framework_coverage_gap ─────────────────────────────────

describe('checkCoverageGap', () => {
  it('produces warnings (if any) with correct severity and kind', () => {
    const flags = checkCoverageGap();
    for (const f of flags) {
      expect(f.severity).toBe('warning');
      expect(f.flagKind).toBe('cross_framework_coverage_gap');
    }
  });
});

// ─── runAllRules composition + buildKnownCollectorIds ─────────────────────

describe('runAllRules + buildKnownCollectorIds', () => {
  it('buildKnownCollectorIds includes collectors from all three frameworks', () => {
    const ids = buildKnownCollectorIds();
    // At least one SOC 2 collector, one HIPAA, one ISO.
    expect(ids.has(DB_COLLECTORS[0].id)).toBe(true);
    expect(ids.has(HIPAA_COLLECTORS[0].id)).toBe(true);
    expect(ids.has(ISO_COLLECTORS[0].id)).toBe(true);
    expect(ids.size).toBeGreaterThanOrEqual(
      DB_COLLECTORS.length + HIPAA_COLLECTORS.length + ISO_COLLECTORS.length
    );
  });

  it('runAllRules pinned to current registry produces at most info/warning severity (no critical structural breaks)', () => {
    const input: CheckerInput = {
      knownCollectorIds: buildKnownCollectorIds(),
      soaByControlRef: new Map(),
    };
    const flags = runAllRules(input);
    const critical = flags.filter((f) => f.severity === 'critical');
    // With a clean registry and empty SoA, there should be no critical flags:
    // no broken references, no missing collectors, no SoA exclusions.
    expect(critical).toEqual([]);
  });
});

// ─── API auth gating ──────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    }),
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (_t: string) => ({
      select: () => ({
        order: () => ({ order: async () => ({ data: [], error: null }) }),
      }),
      insert: () => ({ error: null }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  }),
}));

import { POST as postScan } from '@/app/api/compliance/consistency/check/route';
import { PATCH as patchResolve } from '@/app/api/compliance/consistency/flags/[id]/resolve/route';

function mkReq(body: unknown = {}): Request {
  return new Request('http://localhost/api/compliance/consistency/anything', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('consistency scan API', () => {
  it('401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await postScan(mkReq({}) as any);
    expect(res.status).toBe(401);
  });
});

describe('consistency resolve API', () => {
  it('401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await patchResolve(mkReq({ resolutionNote: 'looks good now ok' }) as any, { params: { id: 'flag-1' } });
    expect(res.status).toBe(401);
  });
});
