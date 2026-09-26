import { describe, expect, it } from 'vitest';

import { planPolicyAlter, quoteIdent, renderAlter, renderManualTemplate } from '../../scripts/audit/emit-alter-policy.ts';
import { buildNestedWrapper, flattenAuthExpr, maxWrapperDepth } from '../../scripts/audit/flatten-auth-expr.ts';
import { assessMerge, type BackupPolicyRow, type LivePolicyRef, type MergeRecord } from '../../scripts/audit/hold-merges.ts';
import { parseCreatePolicies } from '../../scripts/audit/migration-policy-history.ts';
import { branchesEqual, canonicalOrBranches, migrationCompareKey, migrationKeysEqual } from '../../scripts/audit/policy-expr-compare.ts';
import { FLATTEN_CASES, MIGRATION_POLICY_SQL, nestJwt, nestUid } from './fixtures/flatten-cases.ts';

describe('flattenAuthExpr', () => {
  for (const testCase of FLATTEN_CASES) {
    it(testCase.name, () => {
      expect(flattenAuthExpr(testCase.input)).toBe(testCase.expected);
    });
  }

  it('leaves a depth-1 wrapper byte for byte, including the alias', () => {
    const flat = buildNestedWrapper('uid', 1);
    expect(flat).toBe('( SELECT auth.uid() AS uid)');
    expect(flattenAuthExpr(`(${flat})`)).toBe(`(${flat})`);
    expect(maxWrapperDepth(flat)).toBe(1);
  });

  it('reports depth 908 before flatten and depth 1 after', () => {
    const nested = buildNestedWrapper('uid', 908);
    expect(maxWrapperDepth(nested)).toBe(908);
    const flat = flattenAuthExpr(nested);
    expect(flat).toBe('( SELECT auth.uid() AS uid)');
    expect(maxWrapperDepth(flat)).toBe(1);
    expect(flat.length).toBeLessThan(2000);
  });

  it('collapses two calls in one expression without touching the operator between them', () => {
    const input = `${nestUid(3)} = patient_id OR ${nestJwt(2)} ->> 'email' = practitioner_email`;
    const expected = "( SELECT auth.uid() AS uid) = patient_id OR ( SELECT auth.jwt() AS jwt) ->> 'email' = practitioner_email";
    expect(flattenAuthExpr(input)).toBe(expected);
  });

  it('does not treat auth.uid() followed by a cast-only suffix as a wrapper', () => {
    const input = 'auth.uid()::text = owner_id';
    expect(flattenAuthExpr(input)).toBe(input);
    expect(maxWrapperDepth(input)).toBe(0);
  });
});

describe('canonical OR comparison', () => {
  it('treats a depth-1 wrapper as the bare call and ignores extra merge parentheses', () => {
    const current = '((member_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (primary_user_id = ( SELECT auth.uid() AS uid)))';
    const merged = '((member_user_id = auth.uid())) OR ((primary_user_id = auth.uid()))';
    expect(branchesEqual(canonicalOrBranches(current), canonicalOrBranches(merged))).toBe(true);
  });

  it('treats (SELECT auth.uid()) from a migration as auth.uid()', () => {
    const live = '(patient_user_id = ( SELECT auth.uid() AS uid))';
    const migration = '(patient_user_id = (SELECT auth.uid()))';
    expect(branchesEqual(canonicalOrBranches(live), canonicalOrBranches(migration))).toBe(true);
  });

  it('drops a public. schema qualifier', () => {
    expect(canonicalOrBranches('public.is_iso_admin()')).toEqual(canonicalOrBranches('is_iso_admin()'));
  });

  it('treats pg_get_expr qualification, self-alias, and text casts as the migration source', () => {
    const live = "((auditor_email = (auth.jwt() ->> 'email'::text)) AND (revoked = false))";
    const migration = "auditor_email = auth.jwt() ->> 'email' AND revoked = false";
    expect(migrationKeysEqual(migrationCompareKey(live), migrationCompareKey(migration))).toBe(true);
    const liveFamily =
      '(primary_user_id IN ( SELECT family_members_1.primary_user_id FROM family_members family_members_1 WHERE ((family_members_1.member_user_id = auth.uid()) AND (family_members_1.is_active = true))))';
    const migrationFamily =
      'primary_user_id IN ( SELECT primary_user_id FROM family_members WHERE member_user_id = auth.uid() AND is_active = true )';
    expect(migrationKeysEqual(migrationCompareKey(liveFamily), migrationCompareKey(migrationFamily))).toBe(true);
  });

  it('does not treat different parenthesizations as the same expression', () => {
    expect(migrationKeysEqual(migrationCompareKey('(a + b) * c'), migrationCompareKey('a + b * c'))).toBe(false);
    expect(migrationKeysEqual(migrationCompareKey('auth.uid()'), migrationCompareKey('auth.uid'))).toBe(false);
    expect(migrationKeysEqual(migrationCompareKey('(a OR b) AND (c OR d)'), migrationCompareKey('a OR b AND c OR d'))).toBe(false);
  });

  it('does not treat a different relation as the same policy', () => {
    const live =
      'EXISTS ( SELECT 1 FROM patient_practitioner_relationships ppr JOIN practitioners p ON p.id = ppr.practitioner_id WHERE ppr.patient_user_id = engagement_score_snapshots.user_id AND p.user_id = auth.uid() )';
    const migration =
      "EXISTS ( SELECT 1 FROM practitioner_patients pp WHERE pp.patient_id = engagement_score_snapshots.user_id AND pp.practitioner_id = auth.uid() AND pp.status = 'active' )";
    expect(migrationKeysEqual(migrationCompareKey(live), migrationCompareKey(migration))).toBe(false);
  });
});

describe('ALTER POLICY emit', () => {
  it('quotes policy names that contain spaces and emits USING only for SELECT', () => {
    const alter = planPolicyAlter({
      schemaname: 'public',
      tablename: 'protocol_share_activity',
      policyname: 'Share parties write activity',
      permissive: 'PERMISSIVE',
      roles: ['authenticated'],
      cmd: 'SELECT',
      qual: '(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))',
      with_check: '(ignored = ( SELECT ( SELECT auth.uid() AS uid) AS uid))',
    });
    expect(alter).not.toBeNull();
    if (alter === null || alter === 'semicolon') throw new Error('expected an alter');
    expect(alter.usingExpr).toBe('(user_id = ( SELECT auth.uid() AS uid))');
    expect(alter.checkExpr).toBeNull();
    expect(renderAlter(alter)).toBe(
      'ALTER POLICY "Share parties write activity" ON "public"."protocol_share_activity"\n  USING ((user_id = ( SELECT auth.uid() AS uid)));',
    );
  });

  it('emits WITH CHECK only for INSERT', () => {
    const alter = planPolicyAlter({
      schemaname: 'public',
      tablename: 'labs',
      policyname: 'labs_insert',
      permissive: 'PERMISSIVE',
      roles: ['authenticated'],
      cmd: 'INSERT',
      qual: null,
      with_check: '(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))',
    });
    if (alter === null || alter === 'semicolon') throw new Error('expected an alter');
    expect(alter.usingExpr).toBeNull();
    expect(alter.checkExpr).toBe('(user_id = ( SELECT auth.uid() AS uid))');
    expect(renderAlter(alter)).toContain('WITH CHECK');
    expect(renderAlter(alter)).not.toContain('USING');
  });

  it('emits both clauses for ALL and skips an already flat policy', () => {
    const flat = planPolicyAlter({
      schemaname: 'public',
      tablename: 'profiles',
      policyname: 'profiles_all',
      permissive: 'PERMISSIVE',
      roles: ['authenticated'],
      cmd: 'ALL',
      qual: '(id = ( SELECT auth.uid() AS uid))',
      with_check: '(id = ( SELECT auth.uid() AS uid))',
    });
    expect(flat).toBeNull();
    const nested = planPolicyAlter({
      schemaname: 'public',
      tablename: 'profiles',
      policyname: 'profiles_all',
      permissive: 'PERMISSIVE',
      roles: ['authenticated'],
      cmd: 'ALL',
      qual: '(id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))',
      with_check: '(id = ( SELECT auth.uid() AS uid))',
    });
    if (nested === null || nested === 'semicolon') throw new Error('expected an alter');
    const sql = renderManualTemplate(
      { sha256: 'abc', capturedMt: '2026-09-26', held: [], searchPath: '"$user", public, extensions' },
      [nested],
    );
    expect(sql.match(/\bBEGIN;/g)?.length).toBe(1);
    expect(sql.match(/\bCOMMIT;/g)?.length).toBe(1);
    expect(sql).toContain("SET LOCAL lock_timeout = '3s'");
    expect(sql).toContain("SET LOCAL statement_timeout = '60s'");
    expect(sql).toContain('SET LOCAL search_path TO "$user", public, extensions;');
    expect(sql).toContain('LOCK TABLE "public"."profiles" IN ACCESS EXCLUSIVE MODE;');
    expect(sql).not.toContain('\nSET lock_timeout');
    expect(sql).not.toContain('\nSET search_path');
    expect(sql).toContain('md5(pg_get_expr(polqual, polrelid))');
    expect(sql).toContain('RAISE EXCEPTION');
    expect(sql).toContain('USING ((id = ( SELECT auth.uid() AS uid)))');
    expect(sql).toContain('WITH CHECK ((id = ( SELECT auth.uid() AS uid)))');
    const lockAt = sql.indexOf('LOCK TABLE "public"."profiles"');
    const guardAt = sql.indexOf('DO $guard$');
    expect(lockAt).toBeGreaterThan(0);
    expect(lockAt).toBeLessThan(guardAt);
  });

  it('locks each altered table once, before that table\'s guards', () => {
    const qual = '(id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))';
    const row = {
      schemaname: 'public',
      permissive: 'PERMISSIVE',
      roles: ['authenticated'],
      with_check: null,
      qual,
    };
    const first = planPolicyAlter({ ...row, tablename: 'profiles', policyname: 'read own', cmd: 'SELECT' });
    const second = planPolicyAlter({ ...row, tablename: 'profiles', policyname: 'write own', cmd: 'UPDATE', with_check: qual });
    const third = planPolicyAlter({ ...row, tablename: 'audit_logs', policyname: 'admins', cmd: 'SELECT' });
    if (first === null || first === 'semicolon' || second === null || second === 'semicolon' || third === null || third === 'semicolon') {
      throw new Error('expected alters');
    }
    const sql = renderManualTemplate(
      { sha256: 'abc', capturedMt: '2026-09-26', held: [], searchPath: 'public' },
      [first, second, third],
    );
    expect(sql.match(/LOCK TABLE/g)?.length).toBe(2);
    const profilesLock = sql.indexOf('LOCK TABLE "public"."profiles"');
    const profilesGuard = sql.indexOf('-- policy public.profiles :: read own');
    const secondPolicy = sql.indexOf('-- policy public.profiles :: write own');
    const logsLock = sql.indexOf('LOCK TABLE "public"."audit_logs"');
    expect(profilesLock).toBeGreaterThan(profilesGuard);
    expect(profilesLock).toBeLessThan(secondPolicy);
    expect(sql.slice(profilesLock, secondPolicy).match(/LOCK TABLE/g)?.length).toBe(1);
    expect(logsLock).toBeGreaterThan(secondPolicy);
  });

  it('doubles quotes inside identifiers', () => {
    expect(quoteIdent('say "hi"')).toBe('"say ""hi"""');
  });
});

describe('merge HOLD', () => {
  const backup = (policyname: string, qual: string | null, withCheck: string | null, cmd: string): BackupPolicyRow => ({
    schemaname: 'public',
    tablename: 'widgets',
    policyname,
    permissive: 'PERMISSIVE',
    cmd,
    roles: ['authenticated'],
    old_qual: qual,
    old_with_check: withCheck,
    first_backed_up_mt: '2026-04-19 22:52:57',
  });

  it('does not hold when the merged expression is the OR of the originals', () => {
    const merge: MergeRecord = {
      merged_at_mt: '2026-04-19 22:52:57',
      table: 'public.widgets',
      cmd: 'SELECT',
      original_policies: ['widgets_b', 'widgets_a'],
      merged_policy: 'widgets_select_merged',
    };
    const backupByKey = new Map<string, BackupPolicyRow>([
      ['public.widgets.widgets_a', backup('widgets_a', '(owner_id = auth.uid())', null, 'SELECT')],
      ['public.widgets.widgets_b', backup('widgets_b', '(editor_id = auth.uid())', null, 'SELECT')],
    ]);
    const live: LivePolicyRef = {
      schemaname: 'public',
      tablename: 'widgets',
      policyname: 'widgets_select_merged',
      cmd: 'SELECT',
      qual: '((owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (editor_id = ( SELECT auth.uid() AS uid)))',
      with_check: null,
    };
    const assessment = assessMerge(
      merge,
      backupByKey,
      new Map([['public.widgets.widgets_select_merged', live]]),
      new Map(),
    );
    expect(assessment.backupQualMatch).toBe(true);
    expect(assessment.backupCheckMatch).toBe(true);
    expect(assessment.implicitCheckDiffers).toBe(false);
    expect(assessment.migrationStatus).toBe('incomplete');
    expect(assessment.hold).toBe(false);
  });

  it('holds an ALL merge when one original omitted WITH CHECK', () => {
    const merge: MergeRecord = {
      merged_at_mt: '2026-04-19 22:52:57',
      table: 'public.widgets',
      cmd: 'ALL',
      original_policies: ['widgets_open', 'widgets_admin'],
      merged_policy: 'widgets_all_merged',
    };
    const backupByKey = new Map<string, BackupPolicyRow>([
      ['public.widgets.widgets_open', backup('widgets_open', '(owner_id = auth.uid())', null, 'ALL')],
      ['public.widgets.widgets_admin', backup('widgets_admin', '(is_admin())', '(is_admin())', 'ALL')],
    ]);
    const live: LivePolicyRef = {
      schemaname: 'public',
      tablename: 'widgets',
      policyname: 'widgets_all_merged',
      cmd: 'ALL',
      qual: '((owner_id = auth.uid()) OR (is_admin()))',
      with_check: '(is_admin())',
    };
    const assessment = assessMerge(merge, backupByKey, new Map([['public.widgets.widgets_all_merged', live]]), new Map());
    expect(assessment.implicitCheckDiffers).toBe(true);
    expect(assessment.hold).toBe(true);
  });
});

describe('migration policy parser', () => {
  it('reads the last CREATE POLICY bodies out of a DO block and ignores comments', () => {
    const policies = parseCreatePolicies(MIGRATION_POLICY_SQL, 'fixture.sql');
    expect(policies.map((policy) => policy.policyname)).toEqual(['demo_self', 'demo_admin']);
    expect(policies[0]?.qual).toBe('user_id = auth.uid()');
    expect(policies[0]?.withCheck).toBeNull();
    expect(policies[0]?.cmd).toBe('SELECT');
    expect(policies[1]?.cmd).toBe('ALL');
    expect(policies[1]?.qual).toContain("role = 'admin'");
    expect(policies[1]?.withCheck).toContain('auth.uid()');
    expect(policies[1]?.tablename).toBe('demo');
    expect(policies[1]?.schemaname).toBe('public');
  });
});
