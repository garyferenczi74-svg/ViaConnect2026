/**
 * Prompt 227f pg_cron cadence contract.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('227f pg_cron cadence', () => {
  it('migration schedules all six jobs with expected cadences', () => {
    const sql = read(
      'supabase/migrations/20260821270000_prompt_227f_pg_cron_cadence.sql',
    );
    expect(sql).toContain('invoke_viaconnect_bearer_cron');
    expect(sql).toContain('viaconnect_227_retraction_watch_daily');
    expect(sql).toContain("'10 5 * * *'");
    expect(sql).toContain('viaconnect_227_curation_cycle_daily');
    expect(sql).toContain("'25 5 * * *'");
    expect(sql).toContain('viaconnect_227_thanos_apply_daily');
    expect(sql).toContain("'40 5 * * *'");
    expect(sql).toContain('viaconnect_227_deep_sweep_weekly');
    expect(sql).toContain("'50 6 * * 0'");
    expect(sql).toContain('viaconnect_227_drift_audit_weekly');
    expect(sql).toContain("'5 7 * * 0'");
    expect(sql).toContain('viaconnect_227_reverify_quarterly');
    expect(sql).toContain("'20 8 1 1,4,7,10 *'");
    expect(sql).not.toMatch(/[\u2013\u2014]/);
    // No hardcoded secret literals (allow prose like "Bearer CRON_SECRET").
    expect(sql).not.toMatch(/Bearer\s+eyJ[A-Za-z0-9_-]{10,}/);
    expect(sql).not.toMatch(/Authorization',\s*'Bearer [a-f0-9]{16,}/i);
  });

  it('weekly and quarterly routes exist', () => {
    expect(
      read('src/app/api/cron/run-227-deep-sweep/route.ts'),
    ).toContain('deep_sweep_weekly');
    expect(
      read('src/app/api/cron/run-227-drift-audit/route.ts'),
    ).toContain('drift_audit_weekly');
    expect(
      read('src/app/api/cron/run-227-quarterly-reverify/route.ts'),
    ).toContain('quarterly_reverify');
    expect(read('src/lib/kb/migrations/embedded227f.ts')).toContain(
      'PROMPT_227F_MIGRATIONS',
    );
    expect(
      read('src/app/api/cron/prove-227f-pg-cron/route.ts'),
    ).toContain('viaconnect_227_retraction_watch_daily');
  });
});
