import { describe, it, expect, vi } from 'vitest';
import {
  buildFindingsSummary,
  orchestrateDecision,
  type OrchestratorDeps,
  type PrecheckOutcome,
  type VisionOutcome,
} from '@/lib/marshall/scheduler/orchestrator';
import type { SchedulerDraft } from '@/lib/marshall/scheduler/types';

function draft(over: Partial<SchedulerDraft> = {}): SchedulerDraft {
  return {
    source: 'buffer',
    externalId: 'ext1',
    practitionerId: 'p1',
    connectionId: 'c1',
    targetPlatforms: ['instagram'],
    scheduledAt: '2026-05-01T14:00:00Z',
    captionText: 'Check out FARMCEUTICA-GENEX360 today.',
    hashtags: ['wellness'],
    mentionHandles: [],
    mediaAttachments: [],
    editedAt: '2026-04-24T12:00:00Z',
    contentHashSha256: 'abc123',
    ingestedAt: '2026-04-24T12:05:00Z',
    rawPayload: {},
    ...over,
  };
}

function mkDeps(over: Partial<OrchestratorDeps>): OrchestratorDeps {
  return {
    runPrecheck: async () => ({ kind: 'clean', sessionId: 'sess-1', ruleRegistryVersion: 'v4.3.7' }) as PrecheckOutcome,
    runVision: async () => ({ kind: 'not_product_photo' }) as VisionOutcome,
    lookupReceipt: async () => ({ hit: false }),
    issueReceipt: async () => ({ receiptId: 'rcpt-1' }),
    currentRegistryVersion: () => 'v4.3.7',
    ...over,
  };
}

describe('orchestrateDecision — receipt reuse path', () => {
  it('returns clean + receiptReusedId when hash matches', async () => {
    const runPrecheck = vi.fn();
    const deps = mkDeps({
      lookupReceipt: async () => ({ hit: true, receiptId: 'rcpt-existing', ruleRegistryVersion: 'v4.3.7' }),
      runPrecheck,
    });
    const d = await orchestrateDecision(draft(), deps);
    expect(d.decision).toBe('clean');
    expect(d.receiptReusedId).toBe('rcpt-existing');
    expect(d.interceptionAttempted).toBe(false);
    expect(runPrecheck).not.toHaveBeenCalled();
  });

  it('falls through to full scan on lookup error', async () => {
    const deps = mkDeps({
      lookupReceipt: async () => { throw new Error('db_down'); },
    });
    const d = await orchestrateDecision(draft(), deps);
    expect(d.decision).toBe('clean');
    expect(d.receiptIssuedId).toBeTruthy();
  });
});

describe('orchestrateDecision — composite decision table', () => {
  it('clean text + no media -> PASS + new receipt', async () => {
    const deps = mkDeps({});
    const d = await orchestrateDecision(draft(), deps);
    expect(d.decision).toBe('clean');
    expect(d.receiptIssuedId).toBe('rcpt-1');
    expect(d.interceptionAttempted).toBe(false);
  });

  it('clean text + authentic media -> PASS with visionDeterminationId', async () => {
    const deps = mkDeps({
      runVision: async () => ({ kind: 'authentic', determinationId: 'vis-1' }),
    });
    const d = await orchestrateDecision(
      draft({ mediaAttachments: [{ kind: 'image', storageUrl: 'https://example.com/i.jpg' }] }),
      deps,
    );
    expect(d.decision).toBe('clean');
    expect(d.visionDeterminationId).toBe('vis-1');
  });

  it('clean text + counterfeit suspected -> BLOCK (vision critical)', async () => {
    const deps = mkDeps({
      runVision: async () => ({ kind: 'counterfeit_suspected', determinationId: 'vis-cf', severity: 'critical' }),
    });
    const d = await orchestrateDecision(
      draft({ mediaAttachments: [{ kind: 'image', storageUrl: 'https://example.com/i.jpg' }] }),
      deps,
    );
    expect(d.decision).toBe('blocked');
    expect(d.reason).toContain('counterfeit_suspected');
    expect(d.interceptionAttempted).toBe(true);
  });

  it('text findings remediable -> SURFACE', async () => {
    const deps = mkDeps({
      runPrecheck: async () => ({
        kind: 'findings',
        sessionId: 'sess-2',
        ruleRegistryVersion: 'v4.3.7',
        summary: buildFindingsSummary([{ ruleId: 'R.CLAIM', severity: 'P2' }]),
        remediable: true,
      }),
    });
    const d = await orchestrateDecision(draft(), deps);
    expect(d.decision).toBe('findings_surfaced');
    expect(d.interceptionAttempted).toBe(false);
    expect(d.findingsSummary?.total).toBe(1);
  });

  it('text findings high severity non-remediable -> BLOCK', async () => {
    const deps = mkDeps({
      runPrecheck: async () => ({
        kind: 'findings',
        sessionId: 'sess-3',
        ruleRegistryVersion: 'v4.3.7',
        summary: buildFindingsSummary([{ ruleId: 'R.DISEASE', severity: 'P0' }]),
        remediable: false,
      }),
    });
    const d = await orchestrateDecision(draft(), deps);
    expect(d.decision).toBe('blocked');
    expect(d.interceptionAttempted).toBe(true);
  });

  it('precheck pipeline error -> FAIL_CLOSED + no receipt', async () => {
    const deps = mkDeps({
      runPrecheck: async () => { throw new Error('llm_timeout'); },
    });
    const d = await orchestrateDecision(draft(), deps);
    expect(d.decision).toBe('fail_closed');
    expect(d.reason).toContain('precheck_error');
    expect(d.receiptIssuedId).toBeFalsy();
    expect(d.interceptionAttempted).toBe(true);
  });

  it('vision pipeline error on product photo -> FAIL_CLOSED', async () => {
    const deps = mkDeps({
      runVision: async () => { throw new Error('vision_down'); },
    });
    const d = await orchestrateDecision(
      draft({ mediaAttachments: [{ kind: 'image', storageUrl: 'https://example.com/i.jpg' }] }),
      deps,
    );
    expect(d.decision).toBe('fail_closed');
    expect(d.reason).toContain('vision_error');
  });

  it('receipt issuance failure -> FAIL_CLOSED', async () => {
    const deps = mkDeps({
      issueReceipt: async () => { throw new Error('vault_down'); },
    });
    const d = await orchestrateDecision(draft(), deps);
    expect(d.decision).toBe('fail_closed');
    expect(d.reason).toBe('receipt_issuance_failed');
  });
});

describe('orchestrateDecision — fail-closed invariant', () => {
  it('no clean path exists without precheck kind = clean', async () => {
    const permutations: Array<PrecheckOutcome> = [
      { kind: 'error', error: 'anything' },
      { kind: 'findings', sessionId: 's', ruleRegistryVersion: 'v', summary: buildFindingsSummary([{ ruleId: 'X', severity: 'P1' }]), remediable: false },
    ];
    for (const pc of permutations) {
      const d = await orchestrateDecision(draft(), mkDeps({ runPrecheck: async () => pc }));
      expect(d.decision).not.toBe('clean');
    }
  });
});

describe('buildFindingsSummary', () => {
  it('dedupes rule ids and sorts', () => {
    const s = buildFindingsSummary([
      { ruleId: 'R.B', severity: 'P2' },
      { ruleId: 'R.A', severity: 'P1' },
      { ruleId: 'R.A', severity: 'P1' },
    ]);
    expect(s.ruleIds).toEqual(['R.A', 'R.B']);
    expect(s.total).toBe(3);
    expect(s.bySeverity.P1).toBe(2);
    expect(s.bySeverity.P2).toBe(1);
  });
});
