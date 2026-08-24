/**
 * Prompt 226g / G40: Tesamorelin + Kisspeptin stubs and goal links.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROMPT_226D_MIGRATIONS } from '@/lib/kb/migrations/embedded226d';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Prompt 226g G40 stubs', () => {
  const mig = PROMPT_226D_MIGRATIONS.find((m) =>
    m.file.includes('226g_g40_tesamorelin_kisspeptin'),
  );

  it('embeds Tesamorelin and Kisspeptin stubs', () => {
    expect(mig).toBeTruthy();
    expect(mig!.sql).toContain("'tesamorelin'");
    expect(mig!.sql).toContain("'kisspeptin'");
    expect(mig!.sql).toContain('226g-g40-tesamorelin');
    expect(mig!.sql).toContain('226g-g40-kisspeptin');
  });

  it('approves consumer_safe and links goals', () => {
    expect(mig!.sql).toContain("consumer_safe = true");
    expect(mig!.sql).toContain("'weight_body_composition', 'tesamorelin'");
    expect(mig!.sql).toContain("'sexual_function', 'kisspeptin'");
    expect(mig!.sql).toContain('226g-g40-stubs');
  });

  it('avoids banned lexicon and brand strings', () => {
    const lower = mig!.sql.toLowerCase();
    expect(lower).not.toMatch(/semaglutide/);
    expect(lower).not.toMatch(/\bprescription\b/);
    expect(lower).not.toMatch(/\bprotocol\b/);
    expect(lower).not.toMatch(/\brecommend/);
    expect(mig!.sql).not.toMatch(/[\u2013\u2014]/);
    expect(read('supabase/migrations/20260821210000_prompt_226g_g40_tesamorelin_kisspeptin.sql')).toContain(
      'tesamorelin',
    );
  });

  it('keeps educational exclusion tier', () => {
    expect(mig!.sql).toContain("'educational'");
    expect(mig!.sql).not.toContain("'restricted'");
  });

  it('assigns WADA classes per 2026 list (tesamorelin S2.2.4, kisspeptin S2.2.1)', () => {
    expect(mig!.sql).toMatch(/'tesamorelin'[\s\S]*?'prohibited_all_times'[\s\S]*?'S2\.2\.4'/);
    expect(mig!.sql).toMatch(/'kisspeptin'[\s\S]*?'prohibited_all_times'[\s\S]*?'S2\.2\.1'/);
  });
});
