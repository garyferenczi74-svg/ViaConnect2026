/**
 * Prompt 214a: synchronism chain ordering, partial failure, idempotency, advisor tiers.
 */

import { describe, it, expect } from 'vitest';
import {
  runSynchronismChain,
  chainRunIdForDate,
  STAGE_ORDER,
  BASELINE_SECURITY_FINDINGS,
  BASELINE_PERFORMANCE_FINDINGS,
  autoFixIdsOnly,
  reportTierIds,
  assertAdvisorTierBoundary,
} from '../synchronism/chain';
import { KELSEY_DUTY_MAP } from '../kelseyReassignment';

describe('Prompt 214a synchronism chain', () => {
  it('runs stages in fixed order', async () => {
    const run = await runSynchronismChain({ runDate: '2026-08-12' });
    expect(run.stages.map((s) => s.stage)).toEqual([...STAGE_ORDER]);
    expect(run.runId).toBe(chainRunIdForDate('2026-08-12'));
  });

  it('is idempotent by run date (same runId)', async () => {
    const a = await runSynchronismChain({ runDate: '2026-08-12' });
    const b = await runSynchronismChain({ runDate: '2026-08-12' });
    expect(a.runId).toBe(b.runId);
    expect(a.stages).toHaveLength(b.stages.length);
  });

  it('with Hound Dog killed, gate/curate skip and domain stages still run', async () => {
    const run = await runSynchronismChain({
      runDate: '2026-08-12',
      killHoundDog: true,
    });
    const ingest = run.stages.find((s) => s.stage === 'ingest');
    const gate = run.stages.find((s) => s.stage === 'gate');
    const curate = run.stages.find((s) => s.stage === 'curate');
    const domain = run.stages.find((s) => s.stage === 'domain_refresh');
    const compose = run.stages.find((s) => s.stage === 'compose');

    expect(ingest?.status).toBe('failed');
    expect(gate?.status).toBe('skipped');
    expect(curate?.status).toBe('skipped');
    expect(domain?.status).toBe('ok');
    // 214d: compose may be ok or fail-open partial without admin client
    expect(['ok', 'partial']).toContain(compose?.status);
    expect(compose?.detail).toMatchObject({ chain_entry: true });
    expect(run.status).toBe('partial');
  });

  it('Sherlock stage only sees gate-approved counts (never raw ingest when gate skipped)', async () => {
    const run = await runSynchronismChain({ killHoundDog: true, runDate: '2026-08-13' });
    const curate = run.stages.find((s) => s.stage === 'curate');
    expect(curate?.recordsIn).toBe(0);
    expect(curate?.detail).toMatchObject({ reason: 'no_gate_approved_content' });
  });

  it('Hannah compose records chain_entry even when scrape path is down', async () => {
    const run = await runSynchronismChain({ killHoundDog: true, runDate: '2026-08-14' });
    const compose = run.stages.find((s) => s.stage === 'compose');
    // 214d: compose always goes through chain entry (fail-open partial without admin)
    expect(compose?.detail).toMatchObject({ chain_entry: true, from_domain: 4 });
    expect(compose?.producer).toBe('hannah');
  });
});

describe('Prompt 214a advisor tier boundary', () => {
  it('never marks report-tier findings as auto-fixable', () => {
    expect(assertAdvisorTierBoundary(BASELINE_SECURITY_FINDINGS)).toBe(true);
    expect(assertAdvisorTierBoundary(BASELINE_PERFORMANCE_FINDINGS)).toBe(true);

    const autoSec = autoFixIdsOnly(BASELINE_SECURITY_FINDINGS);
    const reportSec = reportTierIds(BASELINE_SECURITY_FINDINGS);
    expect(autoSec.every((id) => !reportSec.includes(id))).toBe(true);
    expect(reportSec).toContain('sec-auth-exposure');
    expect(autoSec).not.toContain('sec-auth-exposure');

    const autoPerf = autoFixIdsOnly(BASELINE_PERFORMANCE_FINDINGS);
    const reportPerf = reportTierIds(BASELINE_PERFORMANCE_FINDINGS);
    expect(autoPerf).not.toContain('perf-slow-query-rewrite');
    expect(reportPerf).toContain('perf-slow-query-rewrite');
  });
});

describe('Prompt 214a gate reassignment', () => {
  it('Hound Dog staging gate duty maps to marshall', () => {
    const row = KELSEY_DUTY_MAP.find((d) => d.duty.includes('Hound Dog'));
    expect(row?.owner).toBe('marshall');
  });

  it('Stage 2 LLM review maps to lex', () => {
    const row = KELSEY_DUTY_MAP.find((d) => d.duty.includes('Stage 2'));
    expect(row?.owner).toBe('lex');
  });
});

describe('Prompt 214c one-writer contract (documentation lock)', () => {
  it('domain digests are produced by gordon, arnold, thanos, and elysium', async () => {
    const run = await runSynchronismChain({ runDate: '2026-08-15' });
    const domain = run.stages.find((s) => s.stage === 'domain_refresh');
    expect(domain?.producer).toEqual(['gordon', 'arnold', 'thanos', 'elysium']);
    expect(domain?.detail).toMatchObject({
      genetics_owner: 'elysium',
      peptide_owner: 'thanos',
    });
  });

  it('compose producer is only hannah', async () => {
    const run = await runSynchronismChain({ runDate: '2026-08-15' });
    const compose = run.stages.find((s) => s.stage === 'compose');
    expect(compose?.producer).toBe('hannah');
  });
});
