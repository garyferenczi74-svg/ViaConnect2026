/**
 * Prompt 227c: Jeffery Curation Ops contract.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('227c Jeffery curation ops', () => {
  it('JefferyClient mounts Curation tab and panel', () => {
    const client = read('src/app/(app)/admin/jeffery/JefferyClient.tsx');
    expect(client).toContain('curation');
    expect(client).toContain('CurationOpsPanel');
    expect(client).toContain('FlaskConical');
    expect(client).toContain('Curation Ops');
  });

  it('API is admin-gated and never writes kb_peptides on approve', () => {
    const api = read('src/app/api/admin/jeffery/curation-ops/route.ts');
    expect(api).toContain('requireAdmin');
    expect(api).toContain('recordCurationRejection');
    expect(api).toContain('kill_switch');
    expect(api).toContain('wroteKbPeptides: false');
    expect(api).not.toMatch(/\.from\(\s*['"]kb_peptides['"]\s*\)\s*\.update\(/);
    expect(api).not.toMatch(/[\u2013\u2014]/);
  });

  it('panel covers kill switch, queue, escalations, rejections', () => {
    const panel = read(
      'src/components/admin/jeffery/CurationOpsPanel.tsx',
    );
    expect(panel).toContain('jeffery-curation-ops');
    expect(panel).toContain('curation-kill-switch');
    expect(panel).toContain('curation-proposal-queue');
    expect(panel).toContain('G61');
    expect(panel).toContain('strokeWidth={1.5}');
    expect(panel).not.toMatch(/[\u2013\u2014]/);
    expect(panel.toLowerCase()).not.toMatch(/\b\d+\s*(mg|mcg|iu)\b/);
  });
});
