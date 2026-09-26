// Read a pg_policies snapshot and emit the flatten migration.
//
// Usage:
//   node --experimental-strip-types scripts/audit/flatten-auth-policies.ts \
//     --snapshot <policies.json> \
//     --backup <policy-rewrite-backup-earliest.json> \
//     --merges <autoheal-merges.json> \
//     --migrations <supabase/migrations> \
//     --out <supabase/migrations/<ts>_flatten_auth_uid_policies.sql> \
//     --summary-out <path.json>
//
// The snapshot, backup, and merges files are inputs. They are not written
// into the migration. Tables whose merged policies disagree with backup
// originals or with migration history are omitted and listed in the summary.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { planPolicyAlter, renderManualTemplate, type PolicyAlter, type PolicyRow } from './emit-alter-policy.ts';
import { flattenAuthExpr, maxWrapperDepth } from './flatten-auth-expr.ts';
import {
  assessMerge,
  heldTables,
  type BackupPolicyRow,
  type HistoryPolicyRef,
  type LivePolicyRef,
  type MergeAssessment,
  type MergeRecord,
} from './hold-merges.ts';
import { loadMigrationPolicyHistory, policyKey, type MigrationPolicyDef } from './migration-policy-history.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parsePolicyRow(value: unknown): PolicyRow {
  if (!isRecord(value)) throw new Error('policy row is not an object');
  if (typeof value.schemaname !== 'string') throw new Error('policy.schemaname');
  if (typeof value.tablename !== 'string') throw new Error('policy.tablename');
  if (typeof value.policyname !== 'string') throw new Error('policy.policyname');
  if (typeof value.permissive !== 'string') throw new Error('policy.permissive');
  if (!isStringArray(value.roles)) throw new Error(`policy.roles ${value.policyname}`);
  if (typeof value.cmd !== 'string') throw new Error('policy.cmd');
  if (!isNullableString(value.qual)) throw new Error(`policy.qual ${value.policyname}`);
  if (!isNullableString(value.with_check)) throw new Error(`policy.with_check ${value.policyname}`);
  return {
    schemaname: value.schemaname,
    tablename: value.tablename,
    policyname: value.policyname,
    permissive: value.permissive,
    roles: value.roles,
    cmd: value.cmd,
    qual: value.qual,
    with_check: value.with_check,
  };
}

function parseBackupRow(value: unknown): BackupPolicyRow {
  if (!isRecord(value)) throw new Error('backup row is not an object');
  if (typeof value.schemaname !== 'string') throw new Error('backup.schemaname');
  if (typeof value.tablename !== 'string') throw new Error('backup.tablename');
  if (typeof value.policyname !== 'string') throw new Error('backup.policyname');
  if (typeof value.permissive !== 'string') throw new Error('backup.permissive');
  if (typeof value.cmd !== 'string') throw new Error('backup.cmd');
  if (!isStringArray(value.roles)) throw new Error('backup.roles');
  if (!isNullableString(value.old_qual)) throw new Error('backup.old_qual');
  if (!isNullableString(value.old_with_check)) throw new Error('backup.old_with_check');
  if (typeof value.first_backed_up_mt !== 'string') throw new Error('backup.first_backed_up_mt');
  return {
    schemaname: value.schemaname,
    tablename: value.tablename,
    policyname: value.policyname,
    permissive: value.permissive,
    cmd: value.cmd,
    roles: value.roles,
    old_qual: value.old_qual,
    old_with_check: value.old_with_check,
    first_backed_up_mt: value.first_backed_up_mt,
  };
}

function parseMerge(value: unknown): MergeRecord {
  if (!isRecord(value)) throw new Error('merge row is not an object');
  if (typeof value.merged_at_mt !== 'string') throw new Error('merge.merged_at_mt');
  if (typeof value.table !== 'string') throw new Error('merge.table');
  if (typeof value.cmd !== 'string') throw new Error('merge.cmd');
  if (!isStringArray(value.original_policies)) throw new Error('merge.original_policies');
  if (typeof value.merged_policy !== 'string') throw new Error('merge.merged_policy');
  return {
    merged_at_mt: value.merged_at_mt,
    table: value.table,
    cmd: value.cmd,
    original_policies: value.original_policies,
    merged_policy: value.merged_policy,
  };
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
}

function readCapturedMt(filePath: string): string {
  const parsed = readJson(filePath);
  if (!isRecord(parsed) || !isRecord(parsed.meta) || typeof parsed.meta.captured_mt !== 'string') {
    throw new Error(`${filePath} is missing meta.captured_mt`);
  }
  return parsed.meta.captured_mt;
}

function readPolicies(filePath: string): PolicyRow[] {
  const parsed = readJson(filePath);
  if (!isRecord(parsed) || !Array.isArray(parsed.policies)) {
    throw new Error(`${filePath} is missing a policies array`);
  }
  return parsed.policies.map((row) => parsePolicyRow(row));
}

function readBackup(filePath: string): BackupPolicyRow[] {
  const parsed = readJson(filePath);
  if (!isRecord(parsed) || !Array.isArray(parsed.policies)) {
    throw new Error(`${filePath} is missing a policies array`);
  }
  return parsed.policies.map((row) => parseBackupRow(row));
}

function readMerges(filePath: string): MergeRecord[] {
  const parsed = readJson(filePath);
  if (!isRecord(parsed) || !Array.isArray(parsed.merges)) {
    throw new Error(`${filePath} is missing a merges array`);
  }
  return parsed.merges.map((row) => parseMerge(row));
}

function argValue(argv: readonly string[], flag: string): string {
  const index = argv.indexOf(flag);
  const value = index === -1 ? undefined : argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`missing ${flag}`);
  }
  return value;
}

function historyRef(def: MigrationPolicyDef): HistoryPolicyRef {
  return { file: def.file, cmd: def.cmd, qual: def.qual, withCheck: def.withCheck };
}

function lengthOf(expr: string | null): number {
  return expr === null ? 0 : expr.length;
}

interface LengthStats {
  readonly policies: number;
  readonly over2000: number;
  readonly maxSingle: number;
  readonly maxSingleName: string;
  readonly maxCombined: number;
  readonly maxCombinedName: string;
  readonly nestedPolicies: number;
  readonly maxDepth: number;
}

function statsFor(policies: readonly PolicyRow[]): LengthStats {
  let over2000 = 0;
  let maxSingle = 0;
  let maxSingleName = '';
  let maxCombined = 0;
  let maxCombinedName = '';
  let nestedPolicies = 0;
  let maxDepth = 0;
  for (const policy of policies) {
    const qual = policy.qual;
    const check = policy.with_check;
    const qLen = lengthOf(qual);
    const cLen = lengthOf(check);
    if (qLen > 2000 || cLen > 2000) over2000 += 1;
    if (qLen > maxSingle) {
      maxSingle = qLen;
      maxSingleName = `${policy.schemaname}.${policy.tablename}.${policy.policyname} qual`;
    }
    if (cLen > maxSingle) {
      maxSingle = cLen;
      maxSingleName = `${policy.schemaname}.${policy.tablename}.${policy.policyname} with_check`;
    }
    if (qLen + cLen > maxCombined) {
      maxCombined = qLen + cLen;
      maxCombinedName = `${policy.schemaname}.${policy.tablename}.${policy.policyname}`;
    }
    const depth = Math.max(maxWrapperDepth(qual ?? ''), maxWrapperDepth(check ?? ''));
    if (depth > maxDepth) maxDepth = depth;
    if (depth >= 2) nestedPolicies += 1;
  }
  return {
    policies: policies.length,
    over2000,
    maxSingle,
    maxSingleName,
    maxCombined,
    maxCombinedName,
    nestedPolicies,
    maxDepth,
  };
}

function renderMigration(args: {
  readonly sha256: string;
  readonly capturedMt: string;
  readonly alters: readonly PolicyAlter[];
  readonly held: ReadonlySet<string>;
}): string {
  return renderManualTemplate(
    {
      sha256: args.sha256,
      capturedMt: args.capturedMt,
      held: [...args.held].sort(),
    },
    args.alters,
  );
}

function main(): void {
  const argv = process.argv.slice(2);
  const snapshotPath = argValue(argv, '--snapshot');
  const backupPath = argValue(argv, '--backup');
  const mergesPath = argValue(argv, '--merges');
  const migrationsDir = argValue(argv, '--migrations');
  const outPath = argValue(argv, '--out');
  const summaryPath = argValue(argv, '--summary-out');

  const snapshotBytes = readFileSync(snapshotPath);
  const sha256 = createHash('sha256').update(snapshotBytes).digest('hex');
  const capturedMt = readCapturedMt(snapshotPath);
  const policies = readPolicies(snapshotPath);
  const backup = readBackup(backupPath);
  const merges = readMerges(mergesPath);
  const history = loadMigrationPolicyHistory(migrationsDir);

  const liveByKey = new Map<string, LivePolicyRef>();
  for (const policy of policies) {
    liveByKey.set(policyKey(policy.schemaname, policy.tablename, policy.policyname), {
      schemaname: policy.schemaname,
      tablename: policy.tablename,
      policyname: policy.policyname,
      cmd: policy.cmd,
      qual: policy.qual,
      with_check: policy.with_check,
    });
  }
  const backupByKey = new Map<string, BackupPolicyRow>();
  for (const row of backup) {
    backupByKey.set(policyKey(row.schemaname, row.tablename, row.policyname), row);
  }
  const historyByKey = new Map<string, HistoryPolicyRef>();
  for (const [key, def] of history) historyByKey.set(key, historyRef(def));

  const assessments: MergeAssessment[] = merges.map((merge) =>
    assessMerge(merge, backupByKey, liveByKey, historyByKey),
  );
  const held = heldTables(assessments);

  const gone = backup.filter((row) => {
    const key = policyKey(row.schemaname, row.tablename, row.policyname);
    if (liveByKey.has(key)) return false;
    const isConstituent = merges.some(
      (merge) => merge.original_policies.includes(row.policyname) || merge.merged_policy === row.policyname,
    );
    return !isConstituent;
  });

  const altersByTable = new Map<string, PolicyAlter[]>();
  const semicolonSkips: string[] = [];
  let changedPolicies = 0;
  let unchangedPolicies = 0;
  let heldPolicySkips = 0;
  for (const policy of policies) {
    const tableKey = `${policy.schemaname}.${policy.tablename}`;
    if (held.has(tableKey)) {
      const planned = planPolicyAlter(policy);
      if (planned !== null && planned !== 'semicolon') heldPolicySkips += 1;
      continue;
    }
    const planned = planPolicyAlter(policy);
    if (planned === null) {
      unchangedPolicies += 1;
      continue;
    }
    if (planned === 'semicolon') {
      semicolonSkips.push(`${tableKey}.${policy.policyname}`);
      continue;
    }
    changedPolicies += 1;
    const list = altersByTable.get(tableKey) ?? [];
    list.push(planned);
    altersByTable.set(tableKey, list);
  }
  for (const list of altersByTable.values()) {
    list.sort((a, b) => (a.policy.policyname < b.policy.policyname ? -1 : a.policy.policyname > b.policy.policyname ? 1 : 0));
  }

  const before = statsFor(policies);
  const afterPolicies: PolicyRow[] = policies.map((policy) => {
    const tableKey = `${policy.schemaname}.${policy.tablename}`;
    if (held.has(tableKey)) return policy;
    const planned = planPolicyAlter(policy);
    if (planned === null || planned === 'semicolon') return policy;
    return {
      ...policy,
      qual: planned.usingExpr !== null ? planned.usingExpr : policy.qual,
      with_check: planned.checkExpr !== null ? planned.checkExpr : policy.with_check,
    };
  });
  const after = statsFor(afterPolicies);
  const unemittedNestedClauses: string[] = [];
  for (const policy of policies) {
    const cmd = policy.cmd.toUpperCase();
    const qualChanges = policy.qual !== null && flattenAuthExpr(policy.qual) !== policy.qual;
    const checkChanges = policy.with_check !== null && flattenAuthExpr(policy.with_check) !== policy.with_check;
    if ((cmd === 'SELECT' || cmd === 'DELETE') && checkChanges) {
      unemittedNestedClauses.push(`${policy.schemaname}.${policy.tablename}.${policy.policyname} with_check`);
    }
    if (cmd === 'INSERT' && qualChanges) {
      unemittedNestedClauses.push(`${policy.schemaname}.${policy.tablename}.${policy.policyname} qual`);
    }
  }

  const alters = [...altersByTable.values()]
    .flat()
    .sort((a, b) => {
      const left = `${a.policy.schemaname}.${a.policy.tablename}.${a.policy.policyname}`;
      const right = `${b.policy.schemaname}.${b.policy.tablename}.${b.policy.policyname}`;
      return left < right ? -1 : left > right ? 1 : 0;
    });
  const sql = renderMigration({
    sha256,
    capturedMt,
    alters,
    held,
  });
  writeFileSync(outPath, sql);

  const summary = {
    snapshotPath: path.basename(snapshotPath),
    sha256,
    snapshotBytes: snapshotBytes.length,
    before,
    after,
    merges: assessments,
    heldTables: [...held].sort(),
    goneBackupPolicies: gone.map((row) => ({
      schemaname: row.schemaname,
      tablename: row.tablename,
      policyname: row.policyname,
      first_backed_up_mt: row.first_backed_up_mt,
    })),
    changedPolicies,
    unchangedPolicies,
    heldPolicySkips,
    semicolonSkips,
    unemittedNestedClauses,
    alterTables: altersByTable.size,
    outPath,
  };
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  process.stdout.write(
    `${JSON.stringify({
      sha256,
      changedPolicies,
      unchangedPolicies,
      heldPolicySkips,
      alterTables: altersByTable.size,
      heldTables: summary.heldTables,
      before,
      after,
      gone: summary.goneBackupPolicies.length,
      mergeHolds: assessments.filter((item) => item.hold).length,
      migrationMatch: assessments.filter((item) => item.migrationStatus === 'match').length,
      migrationDiffer: assessments.filter((item) => item.migrationStatus === 'differ').length,
      migrationIncomplete: assessments.filter((item) => item.migrationStatus === 'incomplete').length,
      implicit: assessments.filter((item) => item.implicitCheckDiffers).length,
    })}\n`,
  );
}

main();
