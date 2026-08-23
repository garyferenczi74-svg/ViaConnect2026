import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Prompt 225 Thanos live ingest proof cron', () => {
  it('prove route requires cron auth and dumps live tables', () => {
    const src = readFileSync(
      path.join(
        process.cwd(),
        'src/app/api/cron/prove-225-thanos-ingest/route.ts',
      ),
      'utf8',
    );
    expect(src).toContain('isCronAuthorized');
    expect(src).toContain('pipeline_runs');
    expect(src).toContain('hounddog_staging_items');
    expect(src).toContain('firecrawl_run_ledger');
    expect(src).toContain('peptide_education_entries');
    expect(src).toContain('runThanosDailyIngest');
    expect(src).toContain('logOpsJobRun');
  });

  it('peptide scout uses deny-list scope and stages without inline Marshall promote', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'src/lib/thanos/allowlistIngest.ts'),
      'utf8',
    );
    expect(src).toContain('assertPeptideScoutScope');
    expect(src).toContain('loadPeptideCatalogForScout');
    expect(src).not.toContain('assertAllowlistScope');
    expect(src).toContain("from('hounddog_staging_items')");
    expect(src).toContain('gate_status');
    expect(src).toContain("onConflict: 'source_url'");
    expect(src).not.toMatch(/\bstatus:\s*gate\.verdict/);
    expect(src).not.toMatch(/consumer_safe\s*:\s*true/);
    expect(src).not.toMatch(/marshall_status\s*:\s*'approved'/);
  });
});

