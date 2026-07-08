// tests/schema/verify-edge-adoption.test.ts
//
// Prompt 210d Task P3-5. Guards scripts/schema/verify-edge-adoption.mjs, the
// zero-dependency checker that asserts each target edge function imports
// ../_shared/schema-drift.ts AND makes at least one reportSupabaseError call.
// Deno is not installed in this environment, so adoption is verified
// statically; this test runs the real script via child_process against a
// throwaway fixture tree and asserts detection in both directions.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const SCRIPT = path.resolve(
  process.cwd(),
  'scripts',
  'schema',
  'verify-edge-adoption.mjs',
);

const ADOPTED_SOURCE = [
  "import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';",
  "import { reportSupabaseError } from '../_shared/schema-drift.ts';",
  '',
  'serve(async () => {',
  "  const error = { code: '42P01', message: 'relation missing' };",
  '  if (error) {',
  "    reportSupabaseError('fn-adopted.demo-insert', error, { table: 'demo_table' });",
  '  }',
  "  return new Response('ok');",
  '});',
  '',
].join('\n');

const BARE_SOURCE = [
  "import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';",
  '',
  "serve(async () => new Response('ok'));",
  '',
].join('\n');

const IMPORT_ONLY_SOURCE = [
  "import { reportSupabaseError } from '../_shared/schema-drift.ts';",
  '',
  'export const unused = typeof reportSupabaseError;',
  '',
].join('\n');

let fixtureRoot = '';

function runScript(args: string[]): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
  });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

beforeAll(() => {
  fixtureRoot = mkdtempSync(path.join(tmpdir(), 'verify-edge-adoption-'));
  const fixtures: Array<[string, string]> = [
    ['fn-adopted', ADOPTED_SOURCE],
    ['fn-bare', BARE_SOURCE],
    ['fn-import-only', IMPORT_ONLY_SOURCE],
  ];
  for (const [slug, source] of fixtures) {
    mkdirSync(path.join(fixtureRoot, slug), { recursive: true });
    writeFileSync(path.join(fixtureRoot, slug, 'index.ts'), source, 'utf8');
  }
});

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true });
});

describe('verify-edge-adoption script', () => {
  it('exits 0 when every target imports schema-drift and calls reportSupabaseError', () => {
    const { status, output } = runScript([
      '--root',
      fixtureRoot,
      '--targets',
      'fn-adopted',
    ]);
    expect(status).toBe(0);
    expect(output).toMatch(/ok fn-adopted: 1 reportSupabaseError call/);
  });

  it('exits 1 and names each non-adopter (missing import or missing call)', () => {
    const { status, output } = runScript([
      '--root',
      fixtureRoot,
      '--targets',
      'fn-adopted,fn-bare,fn-import-only',
    ]);
    expect(status).toBe(1);
    expect(output).toMatch(/FAIL fn-bare/);
    expect(output).toMatch(/FAIL fn-import-only/);
    expect(output).not.toMatch(/FAIL fn-adopted/);
  });

  it('exits 1 when a target directory has no entry file', () => {
    const { status, output } = runScript([
      '--root',
      fixtureRoot,
      '--targets',
      'fn-missing',
    ]);
    expect(status).toBe(1);
    expect(output).toMatch(/FAIL fn-missing/);
  });

  it('defaults to the five live edge function targets', () => {
    const { status, output } = runScript(['--root', fixtureRoot]);
    expect(status).toBe(1);
    const targets = [
      'body-scan-analyze',
      'arnold-vision-analyze',
      'ingest-body-composition',
      'nutrition-insights-daily',
      'nutrition-insights-weekly',
    ];
    for (const slug of targets) {
      expect(output).toContain(slug);
    }
  });
});
