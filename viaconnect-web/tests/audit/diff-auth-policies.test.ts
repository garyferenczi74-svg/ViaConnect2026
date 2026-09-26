import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { flattenAuthExpr } from '../../scripts/audit/flatten-auth-expr.ts';

const SCRIPT = fileURLToPath(new URL('../../scripts/audit/diff-auth-policies.ts', import.meta.url));

interface FixturePolicy {
  readonly schemaname: string;
  readonly tablename: string;
  readonly policyname: string;
  readonly permissive: string;
  readonly roles: readonly string[];
  readonly cmd: string;
  readonly qual: string | null;
  readonly with_check: string | null;
}

const NESTED: FixturePolicy = {
  schemaname: 'public',
  tablename: 'profiles',
  policyname: 'read own',
  permissive: 'PERMISSIVE',
  roles: ['authenticated'],
  cmd: 'SELECT',
  qual: '(id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))',
  with_check: null,
};

function writeSnapshot(dir: string, name: string, policies: readonly FixturePolicy[]): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, JSON.stringify({ policies }));
  return filePath;
}

function run(args: readonly string[]): { status: number | null; stdout: string } {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', SCRIPT, ...args], {
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout };
}

describe('diff-auth-policies exit codes', () => {
  it('exits non-zero on an unflattened snapshot', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'policy-diff-'));
    const snapshot = writeSnapshot(dir, 'before.json', [NESTED]);
    const result = run(['--check', snapshot]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('not flattened');
  });

  it('exits zero when every expression is already flat and under 2,000 characters', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'policy-diff-'));
    const flat: FixturePolicy = {
      ...NESTED,
      qual: flattenAuthExpr(NESTED.qual ?? ''),
    };
    const snapshot = writeSnapshot(dir, 'flat.json', [flat]);
    const result = run(['--check', snapshot]);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('ok\n');
  });

  it('exits zero after a flatten diff and non-zero if after is still the nested snapshot', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'policy-diff-'));
    const before = writeSnapshot(dir, 'before.json', [NESTED]);
    const after = writeSnapshot(dir, 'after.json', [{ ...NESTED, qual: flattenAuthExpr(NESTED.qual ?? '') }]);
    const same = run(['--before', before, '--after', before]);
    expect(same.status).toBe(1);
    const changed = run(['--before', before, '--after', after]);
    expect(changed.status).toBe(0);
  });
});
