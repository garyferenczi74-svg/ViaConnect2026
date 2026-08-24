/**
 * Prompt 214d residual gap tests.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runSynchronismChain } from '@/lib/agents/synchronism/chain';
import { HANNAH_COMPILE_CHAIN_ENTRY } from '@/lib/hannah/compilation/chainEntry';
import { diffRegistries } from '@/lib/agents/registryDrift';
import { AGENT_IDS } from '@/lib/agents/types';
import {
  assertNoPeptidePurchasePath,
  isPractitionerDepthAllowed,
} from '@/lib/thanos/allowlistIngest';

const root = process.cwd();

describe('214d Gap 1: Hannah compile chain authority', () => {
  it('exports chain entry marker', () => {
    expect(HANNAH_COMPILE_CHAIN_ENTRY).toContain('chainEntry');
  });

  it('Compose stage records chain_entry evidence', async () => {
    const run = await runSynchronismChain({
      runDate: '2026-08-16',
      killHoundDog: true,
      runners: {
        compose: async (ctx) => ({
          stage: 'compose',
          status: 'ok',
          producer: 'hannah',
          consumer: 'hannah',
          recordsIn: 4,
          recordsOut: 3,
          durationMs: 1,
          detail: {
            chain_entry: true,
            users_processed: 2,
            insights_written: 3,
            suppliers_consumed: ['gordon', 'elysium'],
            reason: 'chain_compose',
            from_domain: 4,
          },
        }),
      },
    });
    const compose = run.stages.find((s) => s.stage === 'compose');
    expect(compose?.detail).toMatchObject({ chain_entry: true });
    expect(compose?.recordsOut).toBe(3);
  });

  it('vercel.json no longer schedules standalone hannah-compile cron', () => {
    const vercel = readFileSync(join(root, 'vercel.json'), 'utf8');
    expect(vercel).not.toMatch(/hannah-compile/);
    expect(vercel).toMatch(/synchronism-daily/);
  });

  it('standalone hannah-compile route is retired (410 semantics in source)', () => {
    const route = readFileSync(
      join(root, 'src/app/api/cron/hannah-compile/route.ts'),
      'utf8',
    );
    expect(route).toMatch(/410/);
    expect(route).toMatch(/retired/i);
    expect(route).not.toMatch(/runHannahCompilationBatch/);
  });

  it('event recompile imports chainEntry not direct batch cron', () => {
    const recompile = readFileSync(
      join(root, 'src/app/api/hannah/recompile/route.ts'),
      'utf8',
    );
    expect(recompile).toMatch(/compileViaChain/);
    expect(recompile).not.toMatch(/from '@\/lib\/hannah\/compilation\/runCompilation'/);
  });
});

describe('214d Gap 3: no consumer commercial peptide surface', () => {
  it('redirects shop peptides to education in next.config', () => {
    const cfg = readFileSync(join(root, 'next.config.mjs'), 'utf8');
    expect(cfg).toMatch(/shop\/peptides/);
    expect(cfg).toMatch(/peptide-protocol/);
  });

  it('shop peptides page is a redirect shell', () => {
    const page = readFileSync(
      join(root, 'src/app/(app)/(consumer)/shop/peptides/page.tsx'),
      'utf8',
    );
    expect(page).toMatch(/redirect/);
    expect(page).toMatch(/peptide-protocol/);
    expect(page).not.toMatch(/ALL_CATEGORIES/);
  });

  it('purchase path assertions still block shop peptide hrefs', () => {
    expect(assertNoPeptidePurchasePath(['/shop/peptides/x'])).toBe(false);
    expect(assertNoPeptidePurchasePath(['/peptide-protocol'])).toBe(true);
  });

  it('practitioner depth is allowed only on practitioner routes', () => {
    expect(isPractitionerDepthAllowed('/practitioner/peptides')).toBe(true);
    expect(isPractitionerDepthAllowed('/shop/peptides')).toBe(false);
  });
});

describe('214d Gap 4: registry drift guard', () => {
  it('flags ACC seat missing from ultrathink mapping', () => {
    const findings = diffRegistries(AGENT_IDS, [
      { agent_name: 'jeffery', display_name: 'Jeffery', is_active: true },
      // omit most seats to force missing_in_ultrathink
    ]);
    expect(findings.some((f) => f.kind === 'missing_in_ultrathink')).toBe(true);
    expect(findings.find((f) => f.agent_key === 'thanos')?.kind).toBe(
      'missing_in_ultrathink',
    );
  });

  it('flags inactive ultrathink row for live ACC seat', () => {
    const findings = diffRegistries(['hermes'], [
      { agent_name: 'hermes', display_name: 'Hermes', is_active: false },
    ]);
    expect(findings.some((f) => f.kind === 'inactive_divergence')).toBe(true);
  });

  it('clean when all ACC seats mapped active', () => {
    const findings = diffRegistries(
      ['jeffery', 'hannah'],
      [
        { agent_name: 'jeffery', is_active: true },
        { agent_name: 'hannah', is_active: true },
      ],
    );
    expect(findings).toHaveLength(0);
  });
});

describe('214d Gap 5: consumer pathway without depth leakage', () => {
  it('consumer peptide education has discuss-with-practitioner pathway', () => {
    const page = readFileSync(
      join(root, 'src/app/(app)/(consumer)/peptide-protocol/page.tsx'),
      'utf8',
    );
    expect(page).toMatch(/discuss-with-practitioner-pathway/);
    expect(page).not.toMatch(/is_practitioner_depth/);
  });

  it('practitioner depth page exists behind practitioner path', () => {
    const page = readFileSync(
      join(root, 'src/app/(app)/practitioner/peptides/page.tsx'),
      'utf8',
    );
    expect(page).toMatch(/is_practitioner/);
    expect(page).toMatch(/peptide_education_entries/);
    expect(page).toMatch(/Last verified/);
  });
});
