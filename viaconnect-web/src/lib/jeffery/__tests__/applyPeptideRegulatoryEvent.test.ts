import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Prompt 225 Jeffery regulatory apply path', () => {
  it('wrapper calls apply_kb_peptide_regulatory_event RPC only', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'src/lib/jeffery/applyPeptideRegulatoryEvent.ts'),
      'utf8',
    );
    expect(src).toContain('apply_kb_peptide_regulatory_event');
    expect(src).toContain('gary_escalation');
    expect(src).not.toMatch(/from\('kb_peptides'\)[\s\S]*\.update\(/);
  });

  it('cron route requires CRON_SECRET and uses Jeffery wrapper', () => {
    const src = readFileSync(
      path.join(
        process.cwd(),
        'src/app/api/cron/apply-225-jeffery-regulatory/route.ts',
      ),
      'utf8',
    );
    expect(src).toContain('isCronAuthorized');
    expect(src).toContain('applyPeptideRegulatoryEvent');
    expect(src).toContain('applied_at');
  });

  it('Hound Dog findings never recommend not_prohibited', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'src/lib/hounddog/peptideRegulatoryVerify.ts'),
      'utf8',
    );
    expect(src).toContain('assertsNoNotProhibitedRecommendations');
    expect(src).not.toMatch(/recommendedStatus:\s*'not_prohibited'/);
  });
});
