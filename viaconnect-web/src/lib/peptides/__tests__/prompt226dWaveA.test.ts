/**
 * Prompt 226d Wave A: schema + isolation wiring (no writes to live DB here).
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ABSOLUTE_ISOLATION_TABLES_226D } from '@/lib/peptides/absoluteIsolation226d';
import { PROMPT_226D_MIGRATIONS } from '@/lib/kb/migrations/embedded226d';

const ROOT = process.cwd();

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) out.push(...walkTsFiles(full));
    else if (name.name.endsWith('.ts') || name.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

describe('Prompt 226d Wave A schema embeddings', () => {
  it('embeds three Wave A migrations', () => {
    expect(PROMPT_226D_MIGRATIONS).toHaveLength(3);
    expect(PROMPT_226D_MIGRATIONS.map((m) => m.file)).toEqual([
      '20260821180000_prompt_226d_peptide_routes.sql',
      '20260821181000_prompt_226d_goal_domains_and_links.sql',
      '20260821182000_prompt_226d_suggestion_sessions.sql',
    ]);
  });

  it('requires citation when bioavailability_value is set', () => {
    const sql = PROMPT_226D_MIGRATIONS[0]!.sql;
    expect(sql).toContain('kb_peptide_routes_bioavailability_needs_citation');
    expect(sql).toContain(
      'bioavailability_value IS NULL OR bioavailability_citation_id IS NOT NULL',
    );
  });

  it('seeds goal domains and honest thin links', () => {
    const sql = PROMPT_226D_MIGRATIONS[1]!.sql;
    expect(sql).toContain('kb_goal_domains');
    expect(sql).toContain('kb_goal_peptide_links');
    expect(sql).toContain('evidence_grade_for_this_goal');
    expect(sql).toContain('weight_body_composition');
    expect(sql).toContain('tissue_repair_recovery');
    expect(sql).toContain('studied_for_this_goal');
    // Enum allows community_claim_only for future curated rows; Wave A seed must not insert it.
    expect(sql).toContain("'community_claim_only'");
    expect(sql).not.toMatch(
      /VALUES[\s\S]*community_claim_only[\s\S]*JOIN public\.kb_goal_domains/,
    );
    expect(sql).not.toMatch(/,\s*'community_claim_only'\)/);
  });

  it('creates suggestion_sessions with own RLS', () => {
    const sql = PROMPT_226D_MIGRATIONS[2]!.sql;
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.suggestion_sessions');
    expect(sql).toContain('suggestion_sessions_select_own');
    expect(sql).toContain('Absolute isolation');
  });
});

describe('Prompt 226d absolute isolation', () => {
  it('lists suggestion_sessions in the isolation set', () => {
    expect(ABSOLUTE_ISOLATION_TABLES_226D).toContain('suggestion_sessions');
    expect(ABSOLUTE_ISOLATION_TABLES_226D).toContain('converter_sessions');
    expect(ABSOLUTE_ISOLATION_TABLES_226D).toContain('hormone_reports');
  });

  it('Thanos / Hounddog / KB RAG paths do not import suggestion_sessions', () => {
    const dirs = [
      path.join(ROOT, 'src/lib/thanos'),
      path.join(ROOT, 'src/lib/hounddog'),
      path.join(ROOT, 'src/lib/kb'),
    ];
    const offenders: string[] = [];
    for (const dir of dirs) {
      for (const file of walkTsFiles(dir)) {
        if (file.includes(`${path.sep}migrations${path.sep}`)) continue;
        if (file.includes('embedded226')) continue;
        if (file.includes('prompt226dWaveA')) continue;
        const body = readFileSync(file, 'utf8');
        if (/suggestion_sessions/.test(body)) {
          offenders.push(path.relative(ROOT, file));
        }
      }
    }
    expect(offenders, offenders.join(', ')).toEqual([]);
  });
});
