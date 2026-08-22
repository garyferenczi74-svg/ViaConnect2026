/**
 * Prompt 227b Wave B: Science curation transparency contract.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CURATION_TRANSPARENCY_COPY_227B as COPY } from '@/lib/science/curationTransparencyCopy227b';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('227b Science curation transparency', () => {
  it('Science page mounts CurationTransparencyPanel under registry', () => {
    const page = read('src/app/(app)/(consumer)/science/page.tsx');
    expect(page).toContain('SourceRegistryPanel');
    expect(page).toContain('CurationTransparencyPanel');
    const registryIdx = page.indexOf('<SourceRegistryPanel');
    const curationIdx = page.indexOf('<CurationTransparencyPanel');
    expect(registryIdx).toBeGreaterThan(-1);
    expect(curationIdx).toBeGreaterThan(registryIdx);
  });

  it('API route and loader exist', () => {
    expect(
      read('src/app/api/kb/curation-transparency/route.ts'),
    ).toContain('loadCurationTransparency');
    expect(read('src/lib/kb/curationTransparency227b.ts')).toContain(
      'marshall_status',
    );
    expect(read('src/lib/kb/curationTransparency227b.ts')).toContain(
      "eq('marshall_status', 'approved')",
    );
  });

  it('panel uses Lex copy and honest empty states', () => {
    const panel = read(
      'src/components/science/CurationTransparencyPanel.tsx',
    );
    expect(panel).toContain('CURATION_TRANSPARENCY_COPY_227B');
    expect(panel).toContain('science-curation-transparency');
    expect(panel).toContain('science-review-queue');
    expect(panel).toContain('science-corrections-log');
    expect(panel).toContain('science-coverage-negatives');
    expect(COPY.correctionsEmpty).toContain('Marshall-approved');
    expect(COPY.coverageUnknown).toContain('UNKNOWN');
    expect(COPY.reviewEmpty).toContain('0');
  });

  it('copy and SQL-facing modules have no em/en dashes or dose leaks', () => {
    const copy = read('src/lib/science/curationTransparencyCopy227b.ts');
    const panel = read(
      'src/components/science/CurationTransparencyPanel.tsx',
    );
    const loader = read('src/lib/kb/curationTransparency227b.ts');
    for (const src of [copy, panel, loader]) {
      expect(src).not.toMatch(/[\u2013\u2014]/);
      expect(src.toLowerCase()).not.toMatch(/\b\d+\s*(mg|mcg|iu)\b/);
      expect(src.toLowerCase()).not.toMatch(/semaglutide/);
    }
  });

  it('prove cron exists for artifact dump', () => {
    expect(
      read('src/app/api/cron/prove-227b-transparency/route.ts'),
    ).toContain('loadCurationTransparency');
  });
});
