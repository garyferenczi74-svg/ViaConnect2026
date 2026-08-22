import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('227a evidence lane wiring', () => {
  it('migration seeds evidence journals and excludes Mercola from live wiring', () => {
    const sqlPath = path.join(
      process.cwd(),
      'supabase/migrations/20260822020000_prompt_227a_evidence_lane_wire.sql',
    );
    const sql = fs.readFileSync(sqlPath, 'utf8');
    expect(sql).toContain("lane IN ('evidence', 'signal', 'excluded')");
    expect(sql).toContain("'rss'");
    expect(sql).toContain('journal.aging-cell');
    expect(sql).toContain('journal.ajcn');
    expect(sql).toContain('journal.nutrients-mdpi');
    expect(sql).toContain("'35 */6 * * *'");
    expect(sql).toMatch(/Mercola \(EXCLUDED\)/);
    expect(sql).toContain("lane = 'excluded'");
    expect(sql).not.toMatch(/approval_status', 'approved'[\s\S]{0,80}mercola/i);
  });

  it('ingest module never hardcodes Mercola as a source', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/research-hub/evidenceLaneIngest.ts'),
      'utf8',
    );
    expect(src.toLowerCase()).not.toContain('mercola.com');
    expect(src).toContain(".not('domain', 'ilike', '%mercola%')");
    expect(src).toContain("eq('lane', 'evidence')");
  });
});
