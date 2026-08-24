import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  OBSERVED_CLAIMS_FORBIDDEN_IMPORTERS,
  buildClaimParaphrase,
  classifyClaimType,
} from '@/lib/research-hub/claimsObservatory227a';
import { proveDosingClaimRedaction } from '@/lib/research-hub/signalLaneIngest';

describe('227a claims observatory', () => {
  it('classifies dosing headlines and stores no dose value', () => {
    const raw = 'Take 500mg NMN twice daily for longevity benefits';
    const proof = proveDosingClaimRedaction(raw);
    expect(proof.claimType).toBe('dosing');
    expect(proof.storesDose).toBe(false);
    expect(proof.containsDoseToken).toBe(false);
    expect(proof.claimText.toLowerCase()).toContain('dosing claim is circulating');
    expect(proof.claimText).not.toMatch(/500\s*mg/i);
  });

  it('never stores commercial body text in paraphrase helpers', () => {
    const longBody =
      'FULL ARTICLE BODY: Lorem ipsum dolor sit amet. '.repeat(40) +
      'Ashwagandha improves sleep.';
    const claimType = classifyClaimType(longBody);
    const out = buildClaimParaphrase({
      headline: longBody.slice(0, 180),
      sourceLabel: 'Healthline Nutrition',
      claimType,
    });
    expect(out.claimText.length).toBeLessThan(400);
    expect(out.claimText).not.toContain('FULL ARTICLE BODY');
  });

  it('isolates observed_claims from evidence graders and suggestion paths', () => {
    const root = process.cwd();
    for (const rel of OBSERVED_CLAIMS_FORBIDDEN_IMPORTERS) {
      const candidates = [
        path.join(root, `${rel}.ts`),
        path.join(root, `${rel}.tsx`),
        path.join(root, rel, 'index.ts'),
      ];
      for (const file of candidates) {
        if (!fs.existsSync(file)) continue;
        const src = fs.readFileSync(file, 'utf8');
        expect(src).not.toMatch(/observed_claims/);
        expect(src).not.toMatch(/claimsObservatory227a/);
        expect(src).not.toMatch(/signalLaneIngest/);
      }
    }
  });

  it('migration keeps Mercola out of live signal and evidence', () => {
    const sql = fs.readFileSync(
      path.join(
        process.cwd(),
        'supabase/migrations/20260822030000_prompt_227a_signal_freshness_observatory.sql',
      ),
      'utf8',
    );
    expect(sql).toContain('observed_claims');
    expect(sql).toContain('last_item_yielded_at');
    expect(sql).toContain('source_freshness_alerts');
    expect(sql).toContain('youtube.com');
    expect(sql).toContain('pending_access');
    expect(sql).toMatch(/domain ILIKE '%mercola%'/);
    expect(sql).toContain("lane = 'excluded'");
  });
});
